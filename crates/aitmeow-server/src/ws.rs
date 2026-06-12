use crate::app_state::AppState;
use crate::session::SessionEvent;
use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    extract::State,
    response::IntoResponse,
};

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let rx = state.session.read().await.tx.subscribe();
    ws.on_upgrade(move |socket| handle_socket(socket, state, rx))
}

async fn handle_socket(
    mut socket: WebSocket,
    _state: AppState,
    mut rx: tokio::sync::broadcast::Receiver<SessionEvent>,
) {
    loop {
        tokio::select! {
            msg = socket.recv() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
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
                    Some(Ok(Message::Close(_))) | None => break,
                    _ => {}
                }
            }
            event = rx.recv() => {
                if let Ok(event) = event {
                    let json = serde_json::to_string(&event).unwrap_or_default();
                    if json.is_empty() { continue; }
                    if socket.send(Message::Text(json.into())).await.is_err() {
                        break;
                    }
                }
            }
        }
    }
}
