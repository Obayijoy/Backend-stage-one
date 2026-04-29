import { NextFunction, Request, Response } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", () => {
    const responseTime = Date.now() - start;

    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${responseTime}ms`
    );
  });

  next();
}