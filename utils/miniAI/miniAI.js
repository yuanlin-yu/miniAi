import { stream, completion } from './llm/llm';
import { writeFile, deleteFile, readFile, getFileInfo } from './memory/memory';

class Agent {
  constructor(options = {}) {
		this.messages = options.llm.background ? [{ role: 'system', content: options.llm.background }] : [];
		this.temperature = options.llm.temperature || 0.6;
		this.tools = options.tools || {};
		this.updateCallback = null; // 存储页面的更新函数
		this.memory = options.memory ? true : false;
	}
	
	bindUpdateMessages = (callback) => {
    this.updateCallback = callback;
	};
	
	newChat = () => {
		this.messages = [this.messages.find(msg => msg.role === 'system')];
		if (this.updateCallback) {
      this.updateCallback(this.messages); // 触发页面更新
    }
	};

  useChat = async (inputMsg, isStream = false) => {
		if(inputMsg.length === 0) {
			return
		}
		this.messages.push({
			role: 'user',
			content: inputMsg
		})
		if (this.updateCallback) {
      this.updateCallback(this.messages); // 触发页面更新
    }
    try {
			let result;
      if (isStream) {
				stream(this.messages, this.temperature, this.tools, (updatedMessages, error) => {
					if (error) {
						console.error("流式请求出错:", error);
						return;
					}
					this.messages = updatedMessages;
					if (this.updateCallback) {
						this.updateCallback(this.messages); // 触发页面更新
					}
				});
      } else {
				result = await completion(this.messages, this.temperature, this.tools);
				this.messages = result;
				if (this.updateCallback) {
					this.updateCallback(this.messages); // 触发页面更新
				}
			}
    } catch (error) {
      console.error('Chat error:', error);
      throw error;
    }
	}
	
	useMemory = async (type, fileName) => {
		if (!this.memory) {
			return { success: false, error: 'memory 未启动' };
		}	
		try {
			switch (type) {
				case 'write':
					await writeFile(fileName, JSON.stringify(this.messages));
					return { success: true, message: '写入成功' };
				
				case 'read':
					const res = await readFile(fileName);
					return { success: true, data: JSON.parse(res) };
				
				case 'delete':
					await deleteFile(fileName);
					return { success: true, message: '删除成功' };

				case 'info':
					const info = await getFileInfo(fileName);
					return { success: true,  data: info}
				
				default:
					throw new Error(`不支持的操作类型: ${type}`);
			}
		} catch (error) {
			return { 
				success: false, 
				error: error.message || '操作失败',
				detail: error 
			};
		}
	};

	recallMemory = (data) => {
		this.messages = data;
		if (this.updateCallback) {
      this.updateCallback(this.messages); // 触发页面更新
    }
	};

}

module.exports = Agent;