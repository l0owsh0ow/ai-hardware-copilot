FROM python:3.12-slim

WORKDIR /app

# 先装依赖（利用 Docker 层缓存）
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# 拷贝全部源码
COPY . .

# 预下载中文嵌入模型，避免首次启动超时（层内缓存，约 120MB）
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')"

# 运行期使用本地缓存模型
ENV HF_HUB_OFFLINE=1 \
    TRANSFORMERS_OFFLINE=1 \
    DATABASE_PATH=/var/data/components.db \
    CHROMA_PATH=/var/data/chroma \
    LLM_PROVIDER=mock

RUN mkdir -p /var/data && chmod +x /app/backend/start.sh

EXPOSE 8000
CMD ["/app/backend/start.sh"]
