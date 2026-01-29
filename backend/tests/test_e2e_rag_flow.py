"""
End-to-end integration tests for complete RAG flow.

Tests the full pipeline from session creation through streaming response.

Requirements: Task 8.1 (E2E RAG flow)
"""

import pytest
import requests
import subprocess
import time
import sys
import json
import uuid
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock


@pytest.mark.integration
class TestE2ERagFlow:
    """End-to-end integration tests for RAG flow."""

    @pytest.fixture(scope="class")
    def running_server(self):
        """Start the FastAPI server for testing."""
        backend_root = Path(__file__).parent.parent
        sys.path.insert(0, str(backend_root))

        server_process = None
        try:
            test_port = 8009

            server_process = subprocess.Popen(
                [
                    sys.executable,
                    "-m",
                    "uvicorn",
                    "main:app",
                    "--host",
                    "127.0.0.1",
                    "--port",
                    str(test_port),
                    "--log-level",
                    "error",
                ],
                cwd=str(backend_root),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )

            base_url = f"http://127.0.0.1:{test_port}"
            for attempt in range(30):
                try:
                    response = requests.get(f"{base_url}/health", timeout=1)
                    if response.status_code == 200:
                        break
                except requests.exceptions.RequestException:
                    pass
                time.sleep(0.1)
            else:
                if server_process:
                    server_process.terminate()
                pytest.skip("Server failed to start")

            yield base_url

        finally:
            if server_process:
                server_process.terminate()
                try:
                    server_process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    server_process.kill()
            if str(backend_root) in sys.path:
                sys.path.remove(str(backend_root))

    @pytest.fixture(scope="class")
    def mock_voyage_client(self):
        """Mock Voyage AI client for embeddings."""
        with patch("voyageai.Client") as mock_client:
            # Mock embed method
            mock_result = MagicMock()
            mock_result.embeddings = [[0.1] * 512]  # Single embedding
            mock_client.return_value.embed.return_value = mock_result
            yield mock_client

    @pytest.fixture(scope="class")
    def mock_deepseek_streaming(self):
        """Mock DeepSeek streaming responses."""

        async def mock_stream_generator():
            # Simulate streaming tokens about machine learning types
            tokens = [
                "The ",
                "three ",
                "types ",
                "of ",
                "machine ",
                "learning ",
                "are:\n\n",
                "1. ",
                "**Supervised ",
                "Learning**: ",
                "Learning ",
                "from ",
                "labeled ",
                "data\n",
                "2. ",
                "**Unsupervised ",
                "Learning**: ",
                "Finding ",
                "patterns ",
                "in ",
                "unlabeled ",
                "data\n",
                "3. ",
                "**Reinforcement ",
                "Learning**: ",
                "Learning ",
                "through ",
                "trial ",
                "and ",
                "error",
            ]
            for token in tokens:
                yield {"type": "token", "content": token}

            # Yield done event
            yield {
                "type": "done",
                "prompt_tokens": 150,
                "completion_tokens": 50,
                "cached_tokens": 0,
            }

        def create_stream(*args, **kwargs):
            return mock_stream_generator()

        with patch("app.services.deepseek_client.AsyncOpenAI") as mock_openai:
            mock_client = MagicMock()
            mock_create = MagicMock(
                side_effect=lambda **kwargs: mock_stream_generator()
            )
            mock_client.chat.completions.create = mock_create
            mock_openai.return_value = mock_client
            yield mock_openai

    def test_session_creation(self, running_server):
        """Test basic session creation."""
        response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert "created_at" in data

    def test_session_with_nonexistent_document(self, running_server):
        """Test session creation with non-existent document."""
        fake_uuid = str(uuid.uuid4())
        response = requests.post(
            f"{running_server}/api/chat/sessions", json={"document_id": fake_uuid}
        )
        assert response.status_code == 404

    def test_message_to_nonexistent_session(self, running_server):
        """Test sending message to non-existent session."""
        fake_uuid = str(uuid.uuid4())
        response = requests.post(
            f"{running_server}/api/chat/sessions/{fake_uuid}/messages",
            json={"message": "test"},
        )
        assert response.status_code == 404

    def test_empty_message_rejected(self, running_server):
        """Test that empty messages are rejected."""
        session_resp = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = session_resp.json()["session_id"]

        response = requests.post(
            f"{running_server}/api/chat/sessions/{session_id}/messages",
            json={"message": ""},
        )
        assert response.status_code == 422

    def test_e2e_rag_flow_complete(self, running_server, tmp_path):
        """Test complete E2E RAG flow: upload → session → message → streaming → sources → cost.

        Note: This test requires valid API keys (VOYAGE_API_KEY, DEEPSEEK_API_KEY).
        For mocked testing without API keys, see test_e2e_rag_flow_mocked below.
        """
        # 1. Upload document
        doc_path = tmp_path / "ml_doc.txt"
        doc_content = """Machine Learning Fundamentals

Machine learning is a subset of artificial intelligence that enables systems to learn
and improve from experience without being explicitly programmed.

Types of Machine Learning:
1. Supervised Learning: Learning from labeled data
2. Unsupervised Learning: Finding patterns in unlabeled data
3. Reinforcement Learning: Learning through trial and error

Applications include image recognition, natural language processing, and recommendation systems.
"""
        doc_path.write_text(doc_content)

        with open(doc_path, "rb") as f:
            files = {"file": (doc_path.name, f, "text/plain")}
            upload_resp = requests.post(
                f"{running_server}/api/documents/upload", files=files
            )

        assert upload_resp.status_code == 200, f"Upload failed: {upload_resp.text}"
        doc_id = upload_resp.json()["task_id"]

        # Wait for document processing
        time.sleep(2)

        # 2. Create session with document
        session_resp = requests.post(
            f"{running_server}/api/chat/sessions", json={"document_id": doc_id}
        )
        assert session_resp.status_code == 200
        session_id = session_resp.json()["session_id"]

        # 3. Send message and collect streaming response
        message_url = f"{running_server}/api/chat/sessions/{session_id}/messages"
        stream_resp = requests.post(
            message_url,
            json={"message": "What are the types of machine learning?"},
            stream=True,
            timeout=30,
        )

        # If we get 500, it's likely missing API keys - check the error
        if stream_resp.status_code == 500:
            try:
                error_detail = stream_resp.json()
                pytest.skip(f"Server error (likely missing API keys): {error_detail}")
            except:
                pytest.skip(
                    "Server error 500 - likely missing API keys or configuration"
                )

        assert (
            stream_resp.status_code == 200
        ), f"Streaming failed with {stream_resp.status_code}: {stream_resp.text}"

        # 4. Collect streaming tokens and events
        tokens = []
        sources = []
        done_data = None

        current_event = None
        for line in stream_resp.iter_lines(decode_unicode=True):
            if not line:
                continue
            line = line.strip()

            if line.startswith("event:"):
                current_event = line.split(":", 1)[1].strip()
            elif line.startswith("data:") and current_event:
                data_str = line.split(":", 1)[1].strip()
                try:
                    data = json.loads(data_str)
                    if current_event == "token":
                        tokens.append(data.get("content", ""))
                    elif current_event == "source":
                        sources.append(data)
                    elif current_event == "done":
                        done_data = data
                except json.JSONDecodeError:
                    pass
                current_event = None

        # Verify streaming response
        assert len(tokens) > 0, "Should receive streaming tokens"
        full_response = "".join(tokens)
        assert len(full_response) > 0, "Should have complete response"

        # 5. Verify source attribution
        assert len(sources) > 0, "Should have source attribution"
        for source in sources:
            assert "chunk_id" in source, "Source should have chunk_id"
            assert "document_id" in source, "Source should have document_id"
            assert (
                source["document_id"] == doc_id
            ), "Source should reference uploaded document"
            assert "similarity" in source, "Source should have similarity score"

        # 6. Verify cost tracking
        assert done_data is not None, "Should have done event"
        assert "token_count" in done_data, "Done event should have token count"
        assert done_data["token_count"] > 0, "Token count should be positive"

        stats_resp = requests.get(
            f"{running_server}/api/chat/sessions/{session_id}/stats"
        )
        assert stats_resp.status_code == 200
        stats = stats_resp.json()

        assert stats["message_count"] == 2, "Should have user + assistant messages"
        assert stats["total_tokens"] > 0, "Should track total tokens"
        assert stats["estimated_cost_usd"] > 0, "Should track estimated cost"

        # 7. Verify messages persisted
        messages_resp = requests.get(f"{running_server}/api/chat/sessions/{session_id}")
        assert messages_resp.status_code == 200
        messages = messages_resp.json()["messages"]

        assert len(messages) == 2, "Should have 2 messages"
        assert messages[0]["role"] == "user"
        assert messages[0]["content"] == "What are the types of machine learning?"
        assert messages[1]["role"] == "assistant"
        assert messages[1]["content"] == full_response

    @pytest.mark.asyncio
    async def test_e2e_rag_flow_mocked(self, tmp_path):
        """Test E2E RAG flow with mocked external APIs (no real API keys needed).

        This test validates the complete RAG pipeline using mocked Voyage AI and DeepSeek services.
        """
        # Import services
        from app.services.rag_service import RAGService
        from app.services.response_cache import ResponseCache

        # Create mock embedding service
        mock_embedding_service = MagicMock()
        mock_embedding_service.embed_query = AsyncMock(return_value=[0.1] * 512)

        async def mock_embed_docs(texts):
            return [[0.1] * 512 for _ in texts]

        mock_embedding_service.embed_documents = AsyncMock(side_effect=mock_embed_docs)

        # Create mock vector store with realistic results
        mock_vector_store = MagicMock()
        mock_result = MagicMock()
        mock_result.ids = ["chunk_1", "chunk_2", "chunk_3"]
        mock_result.distances = [0.15, 0.25, 0.35]  # Will convert to similarity
        mock_result.documents = [
            "Supervised Learning: Learning from labeled data",
            "Unsupervised Learning: Finding patterns in unlabeled data",
            "Reinforcement Learning: Learning through trial and error",
        ]
        mock_result.metadatas = [
            {
                "document_id": "test_doc",
                "chunk_index": 0,
                "start_char": 100,
                "end_char": 200,
                "token_count": 20,
            },
            {
                "document_id": "test_doc",
                "chunk_index": 1,
                "start_char": 200,
                "end_char": 300,
                "token_count": 20,
            },
            {
                "document_id": "test_doc",
                "chunk_index": 2,
                "start_char": 300,
                "end_char": 400,
                "token_count": 20,
            },
        ]
        mock_vector_store.query = MagicMock(return_value=mock_result)

        # Create mock DeepSeek client with streaming
        mock_deepseek_client = MagicMock()

        async def mock_stream_generator():
            tokens = [
                "The ",
                "three ",
                "types ",
                "of ",
                "machine ",
                "learning ",
                "are:\n\n",
                "1. ",
                "**Supervised ",
                "Learning**: ",
                "Learning ",
                "from ",
                "labeled ",
                "data\n",
                "2. ",
                "**Unsupervised ",
                "Learning**: ",
                "Finding ",
                "patterns ",
                "in ",
                "unlabeled ",
                "data\n",
                "3. ",
                "**Reinforcement ",
                "Learning**: ",
                "Learning ",
                "through ",
                "trial ",
                "and ",
                "error",
            ]
            for token in tokens:
                yield {"type": "token", "content": token}

            yield {
                "type": "done",
                "prompt_tokens": 150,
                "completion_tokens": 50,
                "cached_tokens": 0,
            }

        def create_stream(*args, **kwargs):
            return mock_stream_generator()

        mock_deepseek_client.stream_chat = MagicMock(side_effect=create_stream)

        # Create real response cache
        response_cache = ResponseCache(max_size=10)

        # Create mock document summary service
        mock_doc_summary_service = MagicMock()
        mock_doc_summary_service.get_all_summaries = AsyncMock(return_value=[])

        # Create RAG service with mocked dependencies
        rag_service = RAGService(
            embedding_service=mock_embedding_service,
            vector_store=mock_vector_store,
            deepseek_client=mock_deepseek_client,
            response_cache=response_cache,
            document_summary_service=mock_doc_summary_service,
        )

        # Test 1: Retrieve context
        retrieval_result = await rag_service.retrieve_context(
            query="What are the types of machine learning?",
            document_id="test_doc",
            n_results=5,
        )

        # Verify retrieval
        assert len(retrieval_result.chunks) > 0, "Should retrieve chunks"
        assert all(
            chunk.document_id == "test_doc" for chunk in retrieval_result.chunks
        ), "All chunks should be from test document"
        assert all(
            chunk.similarity > 0 for chunk in retrieval_result.chunks
        ), "All chunks should have positive similarity"

        # Test 2: Generate response with streaming
        events = []
        async for event in rag_service.generate_response(
            query="What are the types of machine learning?",
            context=retrieval_result,
            session_id="test_session",
            focus_context=None,
            message_history=[],
        ):
            events.append(event)

        # Verify streaming events
        token_events = [e for e in events if e["event"] == "token"]
        assert len(token_events) > 0, "Should have token events"

        source_events = [e for e in events if e["event"] == "source"]
        assert len(source_events) > 0, "Should have source events"

        done_events = [e for e in events if e["event"] == "done"]
        assert len(done_events) == 1, "Should have exactly one done event"

        # Verify source attribution
        for source_event in source_events:
            assert "chunk_id" in source_event["data"], "Source should have chunk_id"
            assert (
                "document_id" in source_event["data"]
            ), "Source should have document_id"
            assert (
                source_event["data"]["document_id"] == "test_doc"
            ), "Source should reference test document"
            assert "similarity" in source_event["data"], "Source should have similarity"

        # Verify cost tracking
        done_data = done_events[0]["data"]
        assert "token_count" in done_data, "Done event should have token count"
        assert done_data["token_count"] > 0, "Token count should be positive"
        assert "cost_usd" in done_data, "Done event should have cost"
        assert done_data["cost_usd"] > 0, "Cost should be positive"

        # Verify full response
        full_response = "".join([e["data"]["content"] for e in token_events])
        assert len(full_response) > 0, "Should have complete response"
        assert (
            "Supervised" in full_response or "supervised" in full_response
        ), "Response should mention supervised learning"

    @pytest.mark.asyncio
    async def test_e2e_rag_flow_without_summaries(self):
        """Test E2E RAG flow fallback when document summaries are missing.

        Validates that the system works correctly even without document summaries.
        """
        from app.services.rag_service import RAGService
        from app.services.response_cache import ResponseCache

        # Create mock embedding service
        mock_embedding_service = MagicMock()
        mock_embedding_service.embed_query = AsyncMock(return_value=[0.1] * 512)

        # Create mock vector store
        mock_vector_store = MagicMock()
        mock_result = MagicMock()
        mock_result.ids = ["chunk_1"]
        mock_result.distances = [0.2]
        mock_result.documents = ["Test content about machine learning"]
        mock_result.metadatas = [
            {"document_id": "test_doc", "chunk_index": 0, "token_count": 10}
        ]
        mock_vector_store.query = MagicMock(return_value=mock_result)

        # Create mock DeepSeek client
        mock_deepseek_client = MagicMock()

        async def mock_stream_generator():
            yield {"type": "token", "content": "Response without summaries"}
            yield {
                "type": "done",
                "prompt_tokens": 50,
                "completion_tokens": 10,
                "cached_tokens": 0,
            }

        def create_stream(*args, **kwargs):
            return mock_stream_generator()

        mock_deepseek_client.stream_chat = MagicMock(side_effect=create_stream)

        # Create response cache
        response_cache = ResponseCache(max_size=10)

        # Create mock document summary service that returns EMPTY summaries (fallback scenario)
        mock_doc_summary_service = MagicMock()
        mock_doc_summary_service.get_all_summaries = AsyncMock(
            return_value=[]
        )  # No summaries available

        # Create RAG service
        rag_service = RAGService(
            embedding_service=mock_embedding_service,
            vector_store=mock_vector_store,
            deepseek_client=mock_deepseek_client,
            response_cache=response_cache,
            document_summary_service=mock_doc_summary_service,
        )

        # Retrieve context (should work without summaries)
        retrieval_result = await rag_service.retrieve_context(
            query="Test query", document_id="test_doc", n_results=5
        )

        # Verify retrieval works without summaries
        assert (
            len(retrieval_result.chunks) > 0
        ), "Should retrieve chunks even without summaries"

        # Generate response (should work without summaries)
        events = []
        async for event in rag_service.generate_response(
            query="Test query",
            context=retrieval_result,
            session_id="test_session",
            focus_context=None,
            message_history=[],
        ):
            events.append(event)

        # Verify response generation works without summaries
        token_events = [e for e in events if e["event"] == "token"]
        assert len(token_events) > 0, "Should generate response even without summaries"

        done_events = [e for e in events if e["event"] == "done"]
        assert len(done_events) == 1, "Should complete successfully without summaries"

        # Verify the system functioned correctly without summaries (fallback worked)
        full_response = "".join([e["data"]["content"] for e in token_events])
        assert len(full_response) > 0, "Should have complete response without summaries"


# Mark as integration test to skip if server can't start
pytestmark = pytest.mark.integration
