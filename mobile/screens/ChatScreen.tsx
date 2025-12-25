/**
 * MindBase - Chat Screen
 * AI conversation about saved content
 */
import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { api, ChatMessage, SavedItem } from '../api';

interface Message extends ChatMessage {
    id: string;
    loading?: boolean;
    relatedItems?: SavedItem[];
}

export default function ChatScreen() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '0',
            role: 'assistant',
            content: "Hi! I'm your MindBase AI assistant. Ask me to find saved content, summarize topics, or discover connections. Try:\n\n• \"Find that crypto video I saved\"\n• \"What did I save about AI?\"\n• \"Summarize my saved tech articles\"",
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
        };

        const loadingMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: '',
            loading: true,
        };

        setMessages((prev) => [...prev, userMessage, loadingMessage]);
        setInput('');
        setLoading(true);

        try {
            const history = messages
                .filter((m) => !m.loading)
                .map((m) => ({ role: m.role, content: m.content }));

            const response = await api.chat(userMessage.content, history);

            setMessages((prev) =>
                prev.map((m) =>
                    m.loading ? {
                        ...m,
                        content: response.response,
                        loading: false,
                        relatedItems: response.related_items || [],
                    } : m
                )
            );
        } catch (error) {
            setMessages((prev) =>
                prev.map((m) =>
                    m.loading
                        ? { ...m, content: 'Sorry, I encountered an error. Please try again.', loading: false }
                        : m
                )
            );
        } finally {
            setLoading(false);
        }
    };

    const openUrl = (url: string) => {
        if (url) {
            Linking.openURL(url).catch((err) => console.log('Error opening URL:', err));
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isUser = item.role === 'user';
        const hasRelatedItems = item.relatedItems && item.relatedItems.length > 0;

        return (
            <View
                style={[
                    styles.messageContainer,
                    isUser ? styles.userMessage : styles.assistantMessage,
                ]}
            >
                {item.loading ? (
                    <ActivityIndicator color="#8b8bf5" />
                ) : (
                    <>
                        <Text style={[styles.messageText, isUser && styles.userMessageText]}>
                            {item.content}
                        </Text>
                        {hasRelatedItems && (
                            <View style={styles.relatedItemsContainer}>
                                <Text style={styles.relatedItemsTitle}>Sources:</Text>
                                {item.relatedItems!.map((relItem, index) => (
                                    <TouchableOpacity
                                        key={relItem.id || index}
                                        style={styles.relatedItem}
                                        onPress={() => relItem.source_url && openUrl(relItem.source_url)}
                                        disabled={!relItem.source_url}
                                    >
                                        <Text style={styles.relatedItemTitle} numberOfLines={1}>
                                            {relItem.title || 'Untitled'}
                                        </Text>
                                        {relItem.source_url && (
                                            <Text style={styles.relatedItemUrl} numberOfLines={1}>
                                                {relItem.source_url}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </>
                )}
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={90}
        >
            <View style={styles.header}>
                <Text style={styles.headerTitle}>AI Chat</Text>
                <Text style={styles.headerSubtitle}>Ask about your saved content</Text>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.messagesList}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            />

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Ask me anything..."
                    placeholderTextColor="#666"
                    value={input}
                    onChangeText={setInput}
                    onSubmitEditing={sendMessage}
                    multiline
                    maxLength={500}
                />
                <TouchableOpacity
                    style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
                    onPress={sendMessage}
                    disabled={!input.trim() || loading}
                >
                    <Text style={styles.sendButtonText}>→</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f1a',
    },
    header: {
        padding: 20,
        paddingTop: 60,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a2e',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#888',
        marginTop: 4,
    },
    messagesList: {
        padding: 16,
        paddingBottom: 100,
    },
    messageContainer: {
        maxWidth: '85%',
        padding: 14,
        borderRadius: 16,
        marginBottom: 12,
    },
    userMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#6366f1',
        borderBottomRightRadius: 4,
    },
    assistantMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#1a1a2e',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 15,
        color: '#ddd',
        lineHeight: 22,
    },
    userMessageText: {
        color: '#fff',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        paddingBottom: 30,
        backgroundColor: '#1a1a2e',
        alignItems: 'flex-end',
    },
    input: {
        flex: 1,
        backgroundColor: '#0f0f1a',
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 12,
        color: '#fff',
        fontSize: 16,
        maxHeight: 100,
    },
    sendButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    sendButtonDisabled: {
        backgroundColor: '#2a2a3e',
    },
    sendButtonText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    relatedItemsContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    relatedItemsTitle: {
        fontSize: 12,
        color: '#888',
        marginBottom: 8,
        fontWeight: '600',
    },
    relatedItem: {
        backgroundColor: '#0f0f1a',
        padding: 10,
        borderRadius: 8,
        marginBottom: 6,
    },
    relatedItemTitle: {
        fontSize: 13,
        color: '#8b8bf5',
        fontWeight: '500',
    },
    relatedItemUrl: {
        fontSize: 11,
        color: '#666',
        marginTop: 2,
    },
});
