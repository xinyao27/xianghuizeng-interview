import { NextResponse } from 'next/server';

// 请求缓存，用于防抖
const requestCache = new Map<string, { timestamp: number, response: Promise<NextResponse> }>();

// 清理缓存的间隔时间（毫秒）
const CLEANUP_INTERVAL = 60000;

// 默认防抖时间（毫秒）
const DEFAULT_DEBOUNCE_TIME = 500;

// 定期清理过期的缓存项
if (typeof window === 'undefined') {
  setInterval(() => {
    const now = Date.now();
    requestCache.forEach((value, key) => {
      if (now - value.timestamp > CLEANUP_INTERVAL) {
        requestCache.delete(key);
      }
    });
  }, CLEANUP_INTERVAL);
}

/**
 * 创建防抖请求缓存键
 * @param request 请求对象
 * @returns 缓存键
 */
function createCacheKey(request: Request): string {
  // 获取请求方法、URL和查询参数作为缓存键的基础
  const url = new URL(request.url);
  const method = request.method;
  const searchParams = Array.from(url.searchParams.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(param => `${param[0]}=${param[1]}`)
    .join('&');

  // 对于有请求体的请求，尝试添加请求体到缓存键
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    // 克隆请求以避免读取正文导致的流消耗
    return `${method}:${url.pathname}?${searchParams}:${Date.now()}`;
  }

  return `${method}:${url.pathname}?${searchParams}`;
}

/**
 * API路由防抖中间件
 * @param handler API路由处理函数
 * @param debounceTime 防抖时间（毫秒）
 * @returns 防抖处理后的API路由处理函数
 */
export function withDebounce(
  handler: (request: Request) => Promise<NextResponse>,
  debounceTime = DEFAULT_DEBOUNCE_TIME
) {
  return async function (request: Request): Promise<NextResponse> {
    // 仅对GET请求应用防抖
    if (request.method === 'GET') {
      const cacheKey = createCacheKey(request);
      const now = Date.now();

      // 检查缓存中是否有最近的相同请求
      const cachedItem = requestCache.get(cacheKey);
      if (cachedItem && now - cachedItem.timestamp < debounceTime) {
        return cachedItem.response;
      }

      // 创建新的请求处理Promise并缓存
      const responsePromise = handler(request);
      requestCache.set(cacheKey, {
        timestamp: now,
        response: responsePromise
      });

      return responsePromise;
    }

    // 非GET请求不应用防抖
    return handler(request);
  };
}

/**
 * 前端防抖函数
 * @param fn 要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖处理后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay = DEFAULT_DEBOUNCE_TIME
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>): void {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
} 