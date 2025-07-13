// index.js
import { agent } from '../../utils/miniAI/index';
import {  initRagDB, generateVectorChunksArray, cleanChunks } from '../../utils/miniAI/rag/rag';
import { exampleParagraph } from './data';
const { useChat, messagesCallback, newChat, useMemory, recallMemory } = agent;

Page({
  data: {
   messages: [],
   inputMsg: '',
   keyboardHeight: 0,
   scrollToViewId: '',
   isOpenMenu: false,
   memoryAarray: [],
   currentChatId: ''
  },
  async onLoad() {
    // 初始化Chat
    this.setData({
      currentChatId: String(new Date().getTime())
    });
    await this.addMemory(this.data.currentChatId);
    // 绑定messages更新
    messagesCallback((messages) => {
      this.setData({ messages });
      setTimeout(() => {
        this.setData({
          scrollToViewId: 'msg-'+`${this.data.messages.length - 1}`
        });
        useMemory('write', this.data.currentChatId);
      }, 0);
    });
    // 初始化rag
    await initRagDB('demo');
    await cleanChunks();
    await generateVectorChunksArray(exampleParagraph, 1000, 200);
    // 其他
    wx.onKeyboardHeightChange(res => {
      this.setData({
        keyboardHeight: res.height
      })
    }) 
  },
  send() {
    useChat(this.data.inputMsg, true);
    this.setData({
      inputMsg: ''
    })
  }, 
  onTextChange(event) {
    const value = event.detail.value;  
    this.setData({
      inputMsg: value,
    });
},
onBlur() {
  this.setData({
    keyboardHeight: 0
  })
},
toggleMenu() {
  this.setData({
    isOpenMenu: !this.data.isOpenMenu
  })
  if(this.data.isOpenMenu) {
    this.readChat();
  }
},
async cleanMemory() {
  const memoryFileNameData = await wx.getStorageSync('memory')  || [];
  if(memoryFileNameData.length > 0) {
    const memoryFileNameArray = JSON.parse(memoryFileNameData);
    memoryFileNameArray.forEach(async(name, index) => {
      await useMemory('delete', name);
    })
  }
  wx.setStorageSync('memory', '');
  this.setData({
    memoryAarray: []
  })
  this.startNewChat();
},
async addMemory(chatId) {
  const memoryFileNameData = await wx.getStorageSync('memory')  || [];
  if(memoryFileNameData.length > 0) {
    var memoryFileNameArray = JSON.parse(memoryFileNameData);
    memoryFileNameArray.push(chatId);
  } else {
    var memoryFileNameArray = [chatId];
  }
  wx.setStorageSync('memory', JSON.stringify(memoryFileNameArray)); // 储存 memory 文件名列表
  await useMemory('write', chatId);
},
async startNewChat() {
  this.setData({
    currentChatId: String(new Date().getTime())
  });
  await this.addMemory(this.data.currentChatId);
  newChat();
},
async readChat() {
  this.setData({
    memoryAarray: []
  })
  const memoryFileNameData = await wx.getStorageSync('memory')  || [];
  if(memoryFileNameData.length > 0) {
    const memoryFileNameArray = JSON.parse(memoryFileNameData);
    memoryFileNameArray.forEach(async(name) => {
      let memoryFileData = await useMemory('read', name);
      this.setData({
        memoryAarray: this.data.memoryAarray.concat({
          chatId: name,
          data: memoryFileData
        })
      });
    })
  }
},
async recallChat(e) {
  const chatId = e.currentTarget.dataset.item.chatId;
  const data = e.currentTarget.dataset.item.data;
  this.setData({
    currentChatId: chatId
  });
  await recallMemory(data);
  this.toggleMenu();
}

})
