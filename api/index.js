import { handleWebRequest } from "../src/handler.js";

export function GET(request) {
  return handleWebRequest(request);
}

export function POST(request) {
  return handleWebRequest(request);
}
