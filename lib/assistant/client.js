export async function askAssistant(question, context = {}) {
  const response = await fetch('/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      farmId: context.farmId || null,
      flockId: context.flockId || null,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw Error(data.error || 'Assistant unavailable')
  }

  return data
}