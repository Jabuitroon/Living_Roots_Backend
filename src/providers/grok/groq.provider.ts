/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
export function toModelMessages(messages: any[]) {
  return messages.map((message) => ({
    role: message.role,
    content:
      message.parts
        ?.filter((p) => p.type === 'text')
        .map((p) => p.text)
        .join('\n') ?? ''
  }))
}
