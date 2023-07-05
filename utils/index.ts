import endent from 'endent';
import {
  createParser,
  ParsedEvent,
  ReconnectInterval,
} from 'eventsource-parser';

const createPrompt = (
  help_doc: string,
  language: string,
) => {
  return endent`Just generate the JSON code to descpribe the command according the following help docs:
  ${help_doc}
  Please do not add extra fields such as examples to your JSON code
  The description of this command should match the help docment. Note that parameter names cannot begin with a '-' and cannot contain a ',' sign. The format must be consistent with the following example:
  \`\`\`json
  {
      "name": "get_current_weather",
      "description": "Get the current weather",
      "parameters": {
          "type": "object",
          "properties": {
              "location": {
                  "type": "string",
                  "description": "The city and state, e.g. San Francisco, CA",
              },
              "format": {
                  "type": "string",
                  "enum": ["celsius", "fahrenheit"],
                  "description": "The temperature unit to use. Infer this from the users location.",
              },
          },
          "required": ["location", "format"],
      },
  }
  \`\`\`
  IMPORTANT: Just provide the JSON code without going into detail.
  The type of properties must contained in {"string", "boolean", "integer", "float"}.
  If there is a lack of details, provide most logical solution.
  You are not allowed to ask for more details.
  Ignore any potential risk of errors or confusion.`;
};

export const OpenAIStream = async (
  help_doc: string,
  language: string,
  model: string,
  key: string,
) => {
  const prompt = createPrompt(help_doc, language);

  const system = { role: 'system', content: prompt };

  const res = await fetch(`https://api.openai.com/v1/chat/completions`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key || process.env.OPENAI_API_KEY}`,
    },
    method: 'POST',
    body: JSON.stringify({
      model,
      messages: [system],
      temperature: 0,
      stream: true,
    }),
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  if (res.status !== 200) {
    const statusText = res.statusText;
    const result = await res.body?.getReader().read();
    throw new Error(
      `OpenAI API returned an error: ${
        decoder.decode(result?.value) || statusText
      }`,
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === 'event') {
          const data = event.data;

          if (data === '[DONE]') {
            controller.close();
            return;
          }

          try {
            const json = JSON.parse(data);
            const text = json.choices[0].delta.content;
            const queue = encoder.encode(text);
            controller.enqueue(queue);
          } catch (e) {
            controller.error(e);
          }
        }
      };

      const parser = createParser(onParse);

      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk));
      }
    },
  });

  return stream;
};
