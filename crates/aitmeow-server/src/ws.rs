use crate::app_state::AppState;
use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    extract::State,
    response::IntoResponse,
};

pub async fn ws_handler(ws: WebSocketUpgrade, State(_state): State<AppState>) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket))
}

async fn handle_socket(mut socket: WebSocket) {
    while let Some(Ok(msg)) = socket.recv().await {
        match msg {
            Message::Text(text) => {
                if let Ok(cmd) = serde_json::from_str::<serde_json::Value>(&text) {
                    let msg_type = cmd.get("type").and_then(|v| v.as_str()).unwrap_or("");
                    match msg_type {
                        "ping" => {
                            let _ = socket
                                .send(Message::Text(
                                    serde_json::json!({"type":"pong"}).to_string().into(),
                                ))
                                .await;
                        }
                        _ => {
                            let _ = socket
                                .send(Message::Text(
                                    serde_json::json!({"type":"ack","message":format!("received: {}", msg_type)}).to_string().into(),
                                ))
                                .await;
                        }
                    }
                }
            }
            Message::Close(_) => break,
            _ => {}
        }
    }
}
