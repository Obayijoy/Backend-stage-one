import { NextFunction, Request, Response } from "express";

export function requireApiVersion(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const apiVersion = req.header("X-API-Version");

  if (!apiVersion) {
    return res.status(400).json({
      status: "error",
      message: "API version header required"
    });
  }

  if (apiVersion !== "1") {
    return res.status(400).json({
      status: "error",
      message: "Unsupported API version"
    });
  }

  next();
}