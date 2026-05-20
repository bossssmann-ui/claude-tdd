export function stripFences(raw: string): string {
  let s = raw.trim()
  s = s.replace(/^```[a-zA-Z]*\n/, '')
  s = s.replace(/\n```$/, '')
  return s.trim() + '\n'
}

export function deriveOutputPath(testPath: string): string {
  return testPath.replace(/\.(test|spec)\./, '.')
}
