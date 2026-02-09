const hashStringToInt = (str: string) => {
  return str.split('').reduce((acc, char) => {
    return (acc << 5) - acc + char.charCodeAt(0);
  }, 0);
}

export { hashStringToInt }