/**
 * Generates a random word of the specified length using the provided characters.
 * @param length - The length of the word to generate.
 * @param chars - The characters to use for generating the word. Defaults to lowercase English letters.
 * @returns A randomly generated word.
 */
const generateRandomString = (length: number, chars: string = 'abcdefghijklmnopqrstuvwxyz01234567890'): string => {
  const array = crypto.getRandomValues(new Uint32Array(length))
  let word = ''

  for (let i = 0; i < length; i++) {
    word += chars[array[i] % chars.length]
  }

  return word
}

export { generateRandomString }