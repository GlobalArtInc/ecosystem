/** Logs a debug message when NODE_ENV is "development". */
export const debugLog = (message: string): void => {
  if (process.env.NODE_ENV === "development") {
    console.debug(message);
  }
};
