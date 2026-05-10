import "dotenv/config";

// 测试环境使用测试数据库
process.env.DATABASE_URL ??= "file:./test.db";
process.env.NODE_ENV = "test";
process.env.DEEPSEEK_API_KEY ??= "test-key";
