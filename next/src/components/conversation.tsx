export type MessageProps = {
    sender: string,
    message: string
}
export default function Conversation() {
    return (
        <Message sender='Atlas' message='I have a new sequence I have been meaning to show you, Paul.' />
    )
}

export function Message({ sender, message }: MessageProps) {
    return <p><strong>{sender}</strong>: {message}</p>
}