// vector-db.js
const DEFAULT_DIM = 1024;
const MAX_LEAF_SIZE = 16;
const MAX_TREE_DEPTH = 12;
const fs = wx.getFileSystemManager(); // 获取文件系统管理器

class VectorDB {
  constructor(options = {}) {
    this.dim = options.dim || DEFAULT_DIM;
    this.index = null;
    this.items = [];
    this.nextId = 1;
    this.useTree = options.useTree ?? true;
    this.projectionCache = new Map();
    this.fileBasePath = `${wx.env.USER_DATA_PATH}/${ options.fileName}_rag`; // 文件存储基础路径
  }

  // 归一化向量（优化数值稳定性）
  normalize(vector) {
    const norm = Math.sqrt(vector.reduce((sum, x) => sum + x * x, 0));
    if (norm < 1e-10) return vector; // 避免除以零
    return vector.map(x => x / norm);
  }

  // 添加向量（批量优化）
  add(items) {
    const startId = this.nextId;
    const newItems = items.map((item, i) => ({
      id: startId + i,
      vector: this.normalize(item.vector),
      metadata: item.metadata
    }));
    
    this.items.push(...newItems);
    this.nextId += items.length;
    
    if (this.useTree && this.items.length > MAX_LEAF_SIZE) {
      this.buildIndex();
    }
    
    return this.save();
  }

  // 构建索引（增加防错机制）
  buildIndex() {
    try {
      this.index = this.buildTree(this.items);
    } catch (e) {
      console.warn("Build tree failed, fallback to linear search:", e);
      this.useTree = false;
    }
  }

  // 迭代式建树（替换递归）
  buildTree(items) {
    const stack = [{ items, depth: 0 }];
    const root = {};
    const nodeMap = new WeakMap();

    while (stack.length > 0) {
      const { items, depth, parent, isLeft } = stack.pop();
      
      // 终止条件
      if (items.length <= MAX_LEAF_SIZE || depth >= MAX_TREE_DEPTH) {
        const leaf = { items, isLeaf: true };
        if (parent) parent[isLeft ? 'left' : 'right'] = leaf;
        else Object.assign(root, leaf);
        continue;
      }

      // 生成/获取投影向量（带缓存）
      let projVector;
      const cacheKey = items.length + '-' + depth;
      if (this.projectionCache.has(cacheKey)) {
        projVector = this.projectionCache.get(cacheKey);
      } else {
        projVector = this.generateProjection();
        this.projectionCache.set(cacheKey, projVector);
      }

      // 分割数据
      const { left, right } = this.splitItems(items, projVector);
      
      // 构建节点
      const node = { 
        isLeaf: false, 
        projVector,
        left: null, 
        right: null 
      };
      
      if (parent) {
        parent[isLeft ? 'left' : 'right'] = node;
      } else {
        Object.assign(root, node);
      }

      // 压栈（注意顺序：right先处理）
      stack.push({ items: right, depth: depth + 1, parent: node, isLeft: false });
      stack.push({ items: left, depth: depth + 1, parent: node, isLeft: true });
    }

    return root;
  }

  // 生成投影向量（优化随机性）
  generateProjection() {
    return Array.from({ length: this.dim }, () => 
      Math.random() > 0.5 ? 1 : -1
    );
  }

  // 分割数据集（优化性能）
  splitItems(items, projVector) {
    const left = [];
    const right = [];
    const pivot = Math.random() * 2 - 1; // 动态分割点
    
    items.forEach(item => {
      const dot = dotProduct(item.vector, projVector);
      dot >= pivot ? right.push(item) : left.push(item);
    });

    // 处理极端不均匀分割
    if (left.length === 0 || right.length === 0) {
      const mid = Math.floor(items.length / 2);
      return {
        left: items.slice(0, mid),
        right: items.slice(mid)
      };
    }
    
    return { left, right };
  }

  // 搜索（增加缓存机制）
  search(queryVector, topK = 5) {
    const normalized = this.normalize(queryVector);
    let candidates = this.useTree ? 
      this.treeSearch(normalized) : this.items;
    
    // 优先队列优化（TopK）
    const heap = [];
    candidates.forEach(item => {
      const score = dotProduct(normalized, item.vector);
      if (heap.length < topK || score > heap[0].score) {
        heap.push({ score, item });
        if (heap.length > topK) {
          heap.sort((a, b) => a.score - b.score);
          heap.shift();
        }
      }
    });
    
    return heap.sort((a, b) => b.score - a.score)
              .map(entry => ({
                id: entry.item.id,
                score: entry.score,
                metadata: entry.item.metadata
              }));
  }

  // 树搜索（迭代版）
  treeSearch(vector) {
    let node = this.index;
    const stack = [];
    
    while (node && !node.isLeaf) {
      const dot = dotProduct(vector, node.projVector);
      stack.push(dot >= 0 ? node.right : node.left);
      node = stack[stack.length - 1];
    }
    
    return node?.items || this.items; // 安全回退
  }

  // 存储优化（异步版）
  async save() {
    const meta = { 
      nextId: this.nextId, 
      count: this.items.length,
      timestamp: Date.now()
    };
    
    try {
      // 创建目录（如果不存在）
      try {
        fs.accessSync(this.fileBasePath);
      } catch {
        fs.mkdirSync(this.fileBasePath, { recursive: true });
      }

      // 存储元数据
      const metaPath = `${this.fileBasePath}/meta.json`;
      fs.writeFileSync(metaPath, JSON.stringify(meta), 'utf8');

      // 分块存储向量数据
      const chunkSize = 500;
      const chunkCount = Math.ceil(this.items.length / chunkSize);
      
      for (let i = 0; i < chunkCount; i++) {
        const chunkPath = `${this.fileBasePath}/chunk_${i}.json`;
        const chunkData = this.items.slice(i * chunkSize, (i + 1) * chunkSize);
        fs.writeFileSync(chunkPath, JSON.stringify(chunkData), 'utf8');
      }
      
      // 清理旧的多余分块
      for (let i = chunkCount; ; i++) {
        const oldPath = `${this.fileBasePath}/chunk_${i}.json`;
        try {
          fs.accessSync(oldPath);
          fs.unlinkSync(oldPath);
        } catch {
          break; // 没有更多文件时退出
        }
      }
      
      return true;
    } catch (e) {
      console.error("File save failed:", e);
      return false;
    }
  }

  // 使用文件API加载
  async load() {
    try {
      const metaPath = `${this.fileBasePath}/meta.json`;
      
      // 检查元数据文件是否存在
      try {
        fs.accessSync(metaPath);
      } catch {
        return false; // 文件不存在
      }
      
      // 读取元数据
      const metaContent = fs.readFileSync(metaPath, 'utf8');
      const meta = JSON.parse(metaContent);
      
      this.nextId = meta.nextId;
      this.items = [];
      
      // 读取分块数据
      const chunkCount = Math.ceil(meta.count / 500);
      for (let i = 0; i < chunkCount; i++) {
        const chunkPath = `${this.fileBasePath}/chunk_${i}.json`;
        try {
          const chunkContent = fs.readFileSync(chunkPath, 'utf8');
          this.items.push(...JSON.parse(chunkContent));
        } catch (e) {
          console.error(`Error loading chunk ${i}:`, e);
        }
      }
      
      if (this.useTree && this.items.length > 0) {
        this.buildIndex();
      }
      
      return true;
    } catch (e) {
      console.error("File load failed:", e);
      return false;
    }
  }

  // 清除所有存储的文件
  async clearStorage() {
    try {
      // 检查目录是否存在
      try {
        fs.accessSync(this.fileBasePath);
      } catch {
        return; // 目录不存在无需清理
      }
      
      // 列出所有文件
      const files = fs.readdirSync(this.fileBasePath);
      
      // 删除所有文件
      files.forEach(file => {
        const filePath = `${this.fileBasePath}/${file}`;
        fs.unlinkSync(filePath);
      });
      
      // 删除目录
      fs.rmdirSync(this.fileBasePath);
      
      // 重置内存状态
      this.items = [];
      this.nextId = 1;
      this.index = null;
    } catch (e) {
      console.error("Clear storage failed:", e);
    }
  }
}

// 向量点积（SIMD优化思想）
function dotProduct(v1, v2) {
  let sum = 0;
  for (let i = 0; i < v1.length; i += 4) {
    sum += v1[i] * v2[i] + 
           v1[i+1] * v2[i+1] + 
           v1[i+2] * v2[i+2] + 
           v1[i+3] * v2[i+3];
  }
  return sum;
}

module.exports = VectorDB;