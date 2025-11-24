# Pull qwen2.5:7b model manually
# Run this if Docker Compose auto-pull doesn't work

# Method 1: Inside running container
docker exec -it ekg-ollama ollama pull qwen2.5:7b

# Method 2: If Ollama installed locally
ollama pull qwen2.5:7b

# Verify model is downloaded
docker exec -it ekg-ollama ollama list

# Test the model
docker exec -it ekg-ollama ollama run qwen2.5:7b "Hello"
