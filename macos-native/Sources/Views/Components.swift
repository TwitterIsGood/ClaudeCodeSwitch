import SwiftUI

// MARK: - Toast overlay

struct ToastOverlay: View {
    @EnvironmentObject var store: SettingsStore

    var body: some View {
        VStack(spacing: 8) {
            ForEach(store.toasts) { toast in
                HStack(spacing: 8) {
                    Image(systemName: icon(for: toast.kind))
                        .foregroundStyle(color(for: toast.kind))
                    Text(toast.message)
                        .font(.callout)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(color(for: toast.kind).opacity(0.4)))
                .shadow(radius: 6, y: 2)
                .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .padding(.top, 12)
        .frame(maxWidth: 420)
        .animation(.spring(response: 0.3, dampingFraction: 0.8), value: store.toasts.count)
    }

    private func icon(for kind: ToastKind) -> String {
        switch kind {
        case .success: return "checkmark.circle.fill"
        case .error:   return "exclamationmark.triangle.fill"
        case .info:    return "info.circle.fill"
        }
    }

    private func color(for kind: ToastKind) -> Color {
        switch kind {
        case .success: return .green
        case .error:   return .red
        case .info:    return .accentColor
        }
    }
}

// MARK: - Prompt sheet (text input)

struct PromptSheet: View {
    let request: PromptRequest
    @EnvironmentObject var store: SettingsStore
    @Environment(\.dismiss) private var dismiss
    @State private var text: String = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(request.title).font(.headline)
            TextField(request.placeholder, text: $text)
                .textFieldStyle(.roundedBorder)
                .onSubmit { submit() }
            HStack {
                Spacer()
                Button(store.t("cancel")) { dismiss() }
                    .keyboardShortcut(.cancelAction)
                Button(store.t("confirm")) { submit() }
                    .keyboardShortcut(.defaultAction)
                    .buttonStyle(.borderedProminent)
                    .disabled(text.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .padding(20)
        .frame(width: 360)
    }

    private func submit() {
        let trimmed = text.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        request.onConfirm(trimmed)
        dismiss()
    }
}
