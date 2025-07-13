import Agent from './miniAI';
import { tools } from './tools/tools';

export const agent = new Agent({
	llm: {
		temperature: 1, //temperature越高，生成的文本更多样，反之，生成的文本更确定。范围[0,2)
		background: '你是生活助手',
	},	
	memory: true,
	tools,
});

export const agent2 = new Agent({
	llm: {
		temperature: 0.3,
		background: '你是一名宇宙学家',
	},
	tools,
});