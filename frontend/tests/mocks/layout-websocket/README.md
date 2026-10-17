# Layout WebSocket Mock

This directory contains the WebSocket server used only by layout regression tests.
Playwright starts it with the frontend server on both Windows and Ubuntu CI runners.

The mock accepts and keeps connections open without sending application state. This
matches the synthetic WebSocket used to capture the committed baselines and prevents
connection retries or error messages from changing screenshots. It contains no
production backend code or user content.
