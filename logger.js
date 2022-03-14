import { format, transports, createLogger } from "winston";

const myFormat = format.printf(({ level, message, timestamp }) => {
  return `Log time:${timestamp}, Log level:${level}, Log message:${message}`;
});

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    myFormat
  ),
  transports: [new transports.File({ filename: "./logs/databaseLogs.log" })],
});

logger.add(
  new transports.Console({
    format: myFormat,
  })
);

export default logger;
