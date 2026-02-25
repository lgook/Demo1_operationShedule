# 部署指南

## 📋 部署清单

### 开发环境部署

1. **确认环境**
   ```bash
   node --version  # >= 16.x
   npm --version   # >= 8.x
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发服务器**
   ```bash
   npm start
   # 访问 http://localhost:4200
   ```

### 生产环境部署

#### 方式一：静态托管（推荐）

1. **构建生产版本**
   ```bash
   npm run build
   ```

2. **部署到服务器**
   
   生成的文件在 `dist/surgery-scheduling-app/` 目录下，将其部署到任何静态文件服务器：

   - **Nginx**
     ```nginx
     server {
         listen 80;
         server_name your-domain.com;
         root /path/to/dist/surgery-scheduling-app;
         index index.html;

         location / {
             try_files $uri $uri/ /index.html;
         }
     }
     ```

   - **Apache**
     ```apache
     <VirtualHost *:80>
         ServerName your-domain.com
         DocumentRoot /path/to/dist/surgery-scheduling-app
         
         <Directory /path/to/dist/surgery-scheduling-app>
             Options Indexes FollowSymLinks
             AllowOverride All
             Require all granted
             
             RewriteEngine On
             RewriteBase /
             RewriteRule ^index\.html$ - [L]
             RewriteCond %{REQUEST_FILENAME} !-f
             RewriteCond %{REQUEST_FILENAME} !-d
             RewriteRule . /index.html [L]
         </Directory>
     </VirtualHost>
     ```

#### 方式二：Docker 部署

1. **创建 Dockerfile**
   ```dockerfile
   # 构建阶段
   FROM node:16-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build

   # 运行阶段
   FROM nginx:alpine
   COPY --from=builder /app/dist/surgery-scheduling-app /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. **创建 nginx.conf**
   ```nginx
   server {
       listen 80;
       server_name localhost;
       root /usr/share/nginx/html;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # 启用 gzip
       gzip on;
       gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
   }
   ```

3. **构建和运行**
   ```bash
   # 构建镜像
   docker build -t surgery-scheduling-app .
   
   # 运行容器
   docker run -d -p 80:80 surgery-scheduling-app
   ```

#### 方式三：云平台部署

**Vercel**
```bash
npm install -g vercel
vercel --prod
```

**Netlify**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist/surgery-scheduling-app
```

**GitHub Pages**
```bash
npm install -g angular-cli-ghpages
ng build --prod --base-href "https://username.github.io/repo-name/"
npx angular-cli-ghpages --dir=dist/surgery-scheduling-app
```

## 🔧 配置优化

### 性能优化

1. **启用 AOT 编译**（生产构建默认启用）
   ```bash
   ng build --aot
   ```

2. **启用压缩**
   - Gzip 压缩
   - Brotli 压缩（如果服务器支持）

3. **CDN 加速**
   - 将静态资源部署到 CDN
   - 配置 CDN 域名

### 安全配置

1. **HTTPS**
   - 使用 SSL 证书
   - 强制 HTTPS 重定向

2. **CSP 头**
   ```nginx
   add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';";
   ```

3. **安全响应头**
   ```nginx
   add_header X-Frame-Options "SAMEORIGIN";
   add_header X-Content-Type-Options "nosniff";
   add_header X-XSS-Protection "1; mode=block";
   ```

## 🔍 健康检查

部署后验证以下项目：

- [ ] 应用可正常访问
- [ ] 页面加载速度 < 3秒
- [ ] 日历视图正常显示
- [ ] 表单提交正常
- [ ] 数据持久化正常
- [ ] 移动端显示正常
- [ ] 控制台无错误

## 📊 监控建议

1. **错误监控**
   - 集成 Sentry 或类似服务
   - 监控 JavaScript 错误

2. **性能监控**
   - Google Analytics
   - 页面加载时间
   - 用户行为追踪

3. **日志记录**
   - 记录关键操作
   - 记录错误信息

## 🔄 更新部署

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 安装新依赖
npm install

# 3. 构建
npm run build

# 4. 部署
# 根据部署方式复制文件或执行部署命令
```

## 🆘 故障排查

### 问题：页面刷新后 404

**原因**: 服务器未配置 SPA 路由回退

**解决**: 配置服务器将所有请求重定向到 index.html

### 问题：样式未加载

**原因**: base-href 配置不正确

**解决**: 
```bash
ng build --base-href="/your-path/"
```

### 问题：数据丢失

**原因**: localStorage 被清除

**解决**: 
- 提示用户不要清除浏览器数据
- 考虑使用后端 API 存储数据

## 📞 技术支持

如遇到部署问题：
1. 查看控制台错误日志
2. 检查服务器配置
3. 验证网络连接
4. 查阅文档或提交 Issue

---

**部署成功后，记得进行完整的功能测试！** ✅
