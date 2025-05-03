import { Hono } from 'hono';
import { streamText } from 'hono/streaming';

const app = new Hono();

app.post('*', async (c) => {
  console.log('Handling POST /api/agent');
  
  try {
    const formData = await c.req.formData();
    const message = formData.get('message') as string;
    const image = formData.get('image') as File | null;
    
    let context = message || '';
    
    if (image) {
      // Handle image processing here
      const imageName = image.name;
      const imageSize = image.size;
      context += `\n[Image received: ${imageName}, Size: ${imageSize} bytes]`;
    }
    
    return streamText(c, async (stream) => {
      // Simple response for now - in real app, you would call an AI model here
      const response = `You said: "${context}"`;
      
      // Stream the response character by character
      for (const char of response) {
        await stream.write(char);
        await stream.sleep(10); // Small delay between characters
      }
      
      stream.close();
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return c.text('Error processing request', 500);
  }
});

// Handle errors
app.onError((err, c) => {
  console.error('Hono error:', err);
  return c.text('Internal Server Error', 500);
});

export async function POST(req: Request) {
  return app.fetch(req);
} 