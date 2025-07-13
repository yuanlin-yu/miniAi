const config = require('../env');

export function updateMessages(newValue) {
  messages = newValue
  const pages = getCurrentPages()
  pages.forEach(page => {
      page.setData({ messages })
  })
}

export const completion = (inputMsg, temperature, tools) => {
  return new Promise((resolve, reject) => {
    const messages = [...inputMsg]; // 浅拷贝避免污染原数组
    
    wx.request({
      url: config.LLM_BASEURL,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${config.LLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({
        model: config.LLM_MODEL,
        messages: messages,
        temperature: temperature,
        tools: tools.toolsData || []
      }),
      success(res) {
        const outputMsg = res.data.choices[0].message;
        if (outputMsg.tool_calls) {
          const functionName = outputMsg.tool_calls[0].function.name;
          const params = JSON.parse(outputMsg.tool_calls[0].function.arguments);
          const targetFunction = tools.functions.find(f => f.name === functionName);
          if (!targetFunction) {
            reject(new Error(`未找到工具函数: ${functionName}`));
            return;
          }
          if(targetFunction.isAsync) {
            targetFunction.function(...Object.values(params)).then(functionRes => {
              console.log(functionRes)
              messages.push(
                { role: "assistant", content: null, tool_calls: outputMsg.tool_calls },
                { 
                  role: 'tool', 
                  name: functionName,   // qwen格式需要
                  tool_call_id: outputMsg.tool_calls[0].id,  // deepseek格式需要
                  content: JSON.stringify(functionRes) 
                }
              );
              completion(messages, temperature, tools)
              .then(resolve)  // 将递归结果传递给外部 resolve
              .catch(reject);
            });
          } else {
            const functionRes = targetFunction.function(...Object.values(params));
            console.log(outputMsg.tool_calls[0].id);
            messages.push(
              { role: "assistant", content: null, tool_calls: outputMsg.tool_calls },
              { 
                role: 'tool', 
                name: functionName,   // qwen格式需要
                tool_call_id: outputMsg.tool_calls[0].id,  // deepseek格式需要
                content: JSON.stringify(functionRes) 
              }
            );
            completion(messages, temperature, tools)
            .then(resolve)  // 将递归结果传递给外部 resolve
            .catch(reject);
          }          
        } else {
          messages.push(outputMsg);
          resolve(messages);
        }
      },
      fail(err) {
        reject(err);
      },
    });
  });
};

export const stream = (inputMsg, temperature, tools, onProgress) => {
  const messages = [];
  messages.push(...inputMsg);

  const requestTask = wx.request({
    url: config.LLM_BASEURL,
    method: 'POST',
    responseType: 'arraybuffer', // 接收二进制流
    enableChunked: true, // 启用分块传输
    header: {
      'Authorization': `Bearer ${config.LLM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    data: JSON.stringify({
      model: config.LLM_MODEL,
      messages: messages,
      stream: true, // 开启流式传递
      temperature: temperature,
      tools: tools.toolsData || []
    }),
    success(res) {
      console.log('请求完成', res);
    },
    fail(err) {
      console.error('请求失败', err);
      onProgress?.(null, err); // 错误时回调
    },
  });

  let streamChunk = "";
  let streaming = false;
  let toolCallsArray = []

  // 监听分块数据
  requestTask.onChunkReceived((response) => {
    try {
      const chunkStr = decodeArrayBuffer(response.data);
      const dataStrings = chunkStr.split("data:").slice(1);
      const data = JSON.parse(dataStrings[0].trim());
      if(data.choices?.[0]?.delta?.tool_calls || chunkStr.includes('tool_calls')) {
        dataStrings.forEach(string => {
          const json = JSON.parse(string.trim());
          if(json.choices?.[0]?.delta?.tool_calls) {
            toolCallsArray.push(json.choices?.[0]?.delta?.tool_calls); 
          } else if(json.choices?.[0]?.finish_reason) {
            const { toolInput, toolCalls} = extractToolCallsRes(toolCallsArray);
            const targetFunction = tools.functions.find(f => f.name === toolInput.name);
            if(targetFunction.isAsync) {
              targetFunction.function(...Object.values(toolInput.arguments)).then(functionRes => {
                messages.push(
                  { role: "assistant", content: null, tool_calls: toolCalls },
                  { 
                    role: 'tool', 
                    name: toolInput.name, 
                    tool_call_id: toolCalls[0].id,  // deepseek格式需要
                    content: JSON.stringify(functionRes) 
                  }
                );
                stream(messages, temperature, tools, onProgress);
              });            
            } else {
              const functionRes = targetFunction.function(...Object.values(toolInput.arguments));
              messages.push(
                { role: "assistant", content: null, tool_calls: toolCalls },
                { 
                  role: 'tool', 
                  name: toolInput.name, 
                  tool_call_id: toolCalls[0].id,  // deepseek格式需要
                  content: JSON.stringify(functionRes) 
                }
              );
              stream(messages, temperature, tools, onProgress);
            }
          }
        })       
      } else if (data.choices?.[0]?.delta?.content || data.choices?.[0]?.delta?.role) {
        const result = extractContent(chunkStr);
        streamChunk += result;
        if (streaming) {
          // 更新最后一条消息
          messages[messages.length - 1].content = streamChunk;
        } else {
          if (streamChunk) {
            // 添加新消息
            messages.push({
              role: 'assistant',
              content: streamChunk,
            });
            streaming = true;
          }
        }  
        // 关键：触发回调，返回最新 messages
        onProgress?.(messages, null);
      }
    } catch (e) {
      console.error('数据处理异常:', e);
      onProgress?.(null, e);
    }
  });

  return requestTask; // 返回 requestTask，可用于 abort()
};

// 辅助函数
function decodeArrayBuffer(arrayBuffer) {
  const uint8Array = new Uint8Array(arrayBuffer);
  return decodeURIComponent(escape(String.fromCharCode(...uint8Array)));
}

function extractContent(entireString) {
  const dataStrings = entireString.split("data:").slice(1);
  let result = '';
  for (const dataString of dataStrings) {
    const jsonString = dataString.trim();
    if (!jsonString.includes("DONE")) {
      const data = JSON.parse(jsonString);
      if (data.choices?.[0]?.delta?.content) {
        result += data.choices[0].delta.content;
      }
    }
  }
  return result;
}

function extractToolCallsRes(toolCallsArray) {
  let functionName = '';
  let params = '';
  toolCallsArray.forEach(array => {
    const functionParams = array[0].function;
    if(functionParams.name) {
      functionName += functionParams.name
    }
    if(functionParams.arguments) {
      params += functionParams.arguments
    }
  })
  const toolInput = {
    name: functionName,
    arguments: JSON.parse(params)
  }
  const toolCallsItem = toolCallsArray[0][0];
  const toolCalls = [toolCallsItem]
  return {
    toolInput,
    toolCalls
  }
}