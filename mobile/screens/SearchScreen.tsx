/**
 * MindBase - Search Screen
 * Search saved content using AI
 */
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { api, SavedItem } from '../api';

export default function SearchScreen() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SavedItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const performSearch = async () => {
        if (!query.trim()) return;

        setLoading(true);
        setSearched(true);

        try {
            const response = await api.search(query);
            setResults(response.items || []);
        } catch (error) {
            console.error('Search error:', error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const openItem = (item: SavedItem) => {
        if (item.source_url) {
            Linking.openURL(item.source_url);
        }
    };

    const renderResult = ({ item }: { item: SavedItem }) => (
        <TouchableOpacity style={styles.resultCard} onPress={() => openItem(item)}>
            <Text style={styles.resultTitle} numberOfLines={2}>
                {item.title || 'Untitled'}
            </Text>
            {item.ai_summary && (
                <Text style={styles.resultSummary} numberOfLines={2}>
                    {item.ai_summary}
                </Text>
            )}
            <View style={styles.resultMeta}>
                <Text style={styles.resultPlatform}>{item.source_platform}</Text>
                <View style={styles.categoriesRow}>
                    {item.categories.slice(0, 2).map((cat, idx) => (
                        <Text key={idx} style={styles.categoryTag}>
                            {cat}
                        </Text>
                    ))}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Search</Text>
                <Text style={styles.headerSubtitle}>Find your saved content</Text>
            </View>

            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search for anything..."
                    placeholderTextColor="#666"
                    value={query}
                    onChangeText={setQuery}
                    onSubmitEditing={performSearch}
                    returnKeyType="search"
                />
                <TouchableOpacity style={styles.searchButton} onPress={performSearch}>
                    <Text style={styles.searchButtonText}>🔍</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={styles.loadingText}>Searching...</Text>
                </View>
            ) : searched ? (
                <FlatList
                    data={results}
                    keyExtractor={(item) => item.id}
                    renderItem={renderResult}
                    contentContainerStyle={styles.resultsList}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No results found</Text>
                            <Text style={styles.emptySubtext}>Try a different search term</Text>
                        </View>
                    }
                />
            ) : (
                <View style={styles.suggestionsContainer}>
                    <Text style={styles.suggestionsTitle}>Try searching for:</Text>
                    {['crypto videos', 'AI tutorials', 'saved from Twitter', 'tech articles'].map(
                        (suggestion, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={styles.suggestionChip}
                                onPress={() => {
                                    setQuery(suggestion);
                                    setTimeout(performSearch, 100);
                                }}
                            >
                                <Text style={styles.suggestionText}>{suggestion}</Text>
                            </TouchableOpacity>
                        )
                    )}
                </View>
            )}
        </View>
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
    searchContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        backgroundColor: '#1a1a2e',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 14,
        color: '#fff',
        fontSize: 16,
    },
    searchButton: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    searchButtonText: {
        fontSize: 20,
    },
    resultsList: {
        padding: 16,
    },
    resultCard: {
        backgroundColor: '#1a1a2e',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    resultTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    resultSummary: {
        fontSize: 14,
        color: '#aaa',
        marginTop: 8,
        lineHeight: 20,
    },
    resultMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
    },
    resultPlatform: {
        fontSize: 12,
        color: '#6366f1',
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    categoriesRow: {
        flexDirection: 'row',
    },
    categoryTag: {
        fontSize: 11,
        color: '#888',
        backgroundColor: '#0f0f1a',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginLeft: 6,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#888',
        marginTop: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#888',
        marginTop: 8,
    },
    suggestionsContainer: {
        padding: 20,
    },
    suggestionsTitle: {
        fontSize: 16,
        color: '#888',
        marginBottom: 16,
    },
    suggestionChip: {
        backgroundColor: '#1a1a2e',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 10,
    },
    suggestionText: {
        color: '#fff',
        fontSize: 15,
    },
});
