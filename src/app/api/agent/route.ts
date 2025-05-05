import { LanguageModelV1, streamText } from 'ai';
import { Hono } from 'hono';
import { createQwen } from 'qwen-ai-provider';

import { db } from '@/db/drizzle';
import { createMessage, getTopicById } from '@/db/operations';
import type { MessageRole } from '@/db/schema';

// 初始化Qwen模型
const qwen = createQwen({
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: process.env.DASH_SCOPE_API_KEY,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.DASH_SCOPE_API_KEY}`
  }
});
const model = qwen('qwen-vl-max');

const app = new Hono();

// 支持GET和POST请求
app.get('*', async (c) => await handleRequest(c, 'GET'));
app.post('*', async (c) => await handleRequest(c, 'POST'));

async function handleRequest(c: any, method: string) {
  try {
    // 验证API密钥是否已配置
    if (!process.env.DASH_SCOPE_API_KEY) {
      return c.json({ error: 'DashScope API key is not configured' }, 500);
    }

    let message: string;
    let image: File | null = null;
    let userId: string | undefined;
    let topicId: string | undefined;
    let speed: 'normal' | 'fast' | 'slow' = 'normal';

    // 根据请求方法获取参数
    if (method === 'GET') {
      // 从URL查询参数获取数据
      message = c.req.query('message') || '';
      userId = c.req.query('userId');
      topicId = c.req.query('topicId');
      speed = (c.req.query('speed') || 'normal') as 'normal' | 'fast' | 'slow';
    } else {
      // 从FormData获取数据
      const formData = await c.req.formData();
      message = formData.get('message') as string;
      image = formData.get('image') as File | null;
      userId = formData.get('userId') as string;
      topicId = formData.get('topicId') as string;
      speed = (formData.get('speed') as string || 'normal') as 'normal' | 'fast' | 'slow';
    }

    // 验证输入
    if (!message && !image) {
      return c.json({ error: 'No message or image provided' }, 400);
    }

    // 准备消息内容部分
    type ContentPart = {
      type: 'text' | 'image';
      text?: string;
      image?: Uint8Array;
      mimeType?: string;
    };

    const contentParts: ContentPart[] = [];

    // 添加文本内容（如果存在）
    if (message) {
      contentParts.push({
        type: 'text' as const,
        text: message
      });
    }

    // 添加图像内容（如果存在）
    if (image) {
      try {
        const imageBuffer = await image.arrayBuffer();
        contentParts.push({
          type: 'image' as const,
          image: new Uint8Array(imageBuffer),
          mimeType: image.type
        });
      } catch (error) {
        console.error('Error processing image:', error);
        return c.json({ error: 'Failed to process image' }, 400);
      }
    }

    // 如果提供了userId，则将用户消息保存到数据库
    if (userId && db) {
      try {
        // 检查topicId是否存在
        if (topicId) {
          // 只验证话题是否存在及所有权，不再创建新话题
          const topic = await getTopicById(topicId);
          if (!topic) {
            console.log(`Topic not found: ${topicId}, will create messages without topic`);
          } else if (topic.user_id !== userId) {
            console.log(`Topic ${topicId} does not belong to user ${userId}, will create messages without topic`);
            topicId = undefined;
          }
        }
        // 移除这里的创建新话题逻辑，仅当没有提供topicId时记录日志
        else {
          console.log('No topicId provided, messages will be created without topic association');
        }

        // 只有在有效的topicId时才保存用户消息
        if (topicId) {
          // 处理图片元数据
          let metadata = undefined;
          if (image) {
            try {
              metadata = JSON.stringify({
                hasImage: true,
                imageType: image.type || 'image/jpeg',
                imagePreview: 'Image was uploaded' // 简单标记图片存在
              });
            } catch (error) {
              console.error('Error creating image metadata:', error);
            }
          }

          const savedMessage = await createMessage({
            topicId,
            role: 'user' as MessageRole,
            content: message,
            userId,
            metadata,
            created_at: new Date().toISOString()
          });
          console.log(`User message saved with ID: ${savedMessage?.id}`);
        }
      } catch (dbError) {
        console.error('Error processing database operations:', dbError);
        // 即使数据库操作失败，也继续执行
      }
    }

    // 创建来自DashScope的响应流
    try {
      // 使用Hono原生方式创建EventStream响应
      const stream = new ReadableStream({
        async start(controller) {
          try {
            let fullResponse = '';

            // 使用类型断言创建消息
            const messages = [{
              role: 'user',
              content: contentParts
            }] as any;

            const modelStream = await streamText({
              model: model as LanguageModelV1,
              messages,
              temperature: 0.7,
              maxTokens: 1000,
            });

            // 获取原始响应流
            const response = modelStream.toDataStreamResponse();
            const reader = response.body?.getReader();

            if (!reader) {
              throw new Error('Stream reader is null');
              return;
            }

            // 处理流数据并转换为SSE格式
            let reading = true;
            while (reading) {
              const { done, value } = await reader.read();
              if (done) {
                reading = false;
                break;
              }

              const text = new TextDecoder().decode(value);

              // 处理Qwen特殊的返回格式
              if (text.startsWith('0:')) {
                // 提取引号中的文本内容
                const contentMatch = text.match(/0:"([^"]*)"/);
                if (contentMatch && contentMatch[1]) {
                  const content = contentMatch[1];
                  fullResponse += content;

                  // 构造SSE消息格式
                  const data = `data: ${JSON.stringify({ text: content })}`;
                  controller.enqueue(new TextEncoder().encode(data));

                  // 根据速度参数调整延迟时间
                  let delayTime = 100; // 默认延迟(normal)
                  if (speed === 'fast') {
                    delayTime = 20; // 快速模式，几乎无延迟
                  } else if (speed === 'slow') {
                    delayTime = 200; // 慢速模式，更长延迟
                  }

                  // 添加随机因素，使打字效果更自然
                  await new Promise(resolve => setTimeout(resolve,
                    Math.floor(delayTime + Math.random() * (delayTime * 0.4))));
                }
              } else if (!text.startsWith('e:') && !text.startsWith('d:')) {
                // 如果不是元数据且格式不是预期的，直接发送
                fullResponse += text;
                const data = `data: ${JSON.stringify({ text })}`;
                controller.enqueue(new TextEncoder().encode(data));

                // 这里也添加延迟
                let delayTime = 100; // 默认延迟(normal)
                if (speed === 'fast') {
                  delayTime = 20; // 快速模式，几乎无延迟
                } else if (speed === 'slow') {
                  delayTime = 200; // 慢速模式，更长延迟
                }

                // 添加随机因素，使打字效果更自然
                await new Promise(resolve => setTimeout(resolve,
                  Math.floor(delayTime + Math.random() * (delayTime * 0.4))));
              }
              // 跳过元数据块(e: 和 d:)
            }

            // 存储完整响应到数据库
            if (userId && topicId && fullResponse) {
              try {
                // 确保topicId有效再保存AI响应
                const topic = await getTopicById(topicId);
                if (topic && topic.user_id === userId) {
                  const savedAiMessage = await createMessage({
                    topicId,
                    role: 'assistant' as MessageRole,
                    content: fullResponse,
                    userId,
                    created_at: new Date().toISOString()
                  });

                  // 发送AI消息ID
                  if (savedAiMessage?.id) {
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ messageId: savedAiMessage.id })}`));
                  }
                } else {
                  console.log(`Not saving AI response: Topic ${topicId} invalid or doesn't belong to user ${userId}`);
                }
              } catch (dbError) {
                console.error('Error saving AI response to database:', dbError);
              }
            }

            // 发送结束事件
            controller.enqueue(new TextEncoder().encode('event: end\ndata: {}'));
            controller.close();
          } catch (error) {
            console.error('Stream processing error:', error);
            controller.error(error instanceof Error ? error : new Error(String(error)));
          }
        }
      });

      // 返回SSE响应
      return c.newResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    } catch (error) {
      console.error('API error:', error);
      return c.json({
        error: 'An error occurred while processing your request',
        details: error instanceof Error ? error.message : String(error)
      }, 500);
    }
  } catch (error) {
    console.error('Request handler error:', error);
    return c.json({
      error: 'An error occurred while processing your request',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
}

// 处理错误
app.onError((err, c) => {
  console.error('Hono error:', err);
  return c.json({
    error: 'Internal server error',
    details: err instanceof Error ? err.message : 'Unknown error'
  }, 500);
});

// 由于agent API使用了Hono并返回Response对象而不是NextResponse，
// 不能直接使用withDebounce函数。对于这种情况，我们保持原来的代码不变。

export async function POST(req: Request) {
  return app.fetch(req);
}

export async function GET(req: Request) {
  return app.fetch(req);
}
