/**
 * MindBase - Home Screen
 * Shows saved items feed
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Image,
    StyleSheet,
    Linking,
} from 'react-native';
import { api, SavedItem, Category } from '../api';

const platformColors: Record<string, string> = {
    youtube: '#FF0000',
    twitter: '#1DA1F2',
    tiktok: '#000000',
    telegram: '#0088CC',
    whatsapp: '#25D366',
    instagram: '#E4405F',
    facebook: '#1877F2',
    generic: '#6366F1',
};

interface ItemCardProps {
    item: SavedItem;
    onPress: () => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, onPress }) => {
    const platformColor = platformColors[item.source_platform] || platformColors.generic;

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
            {item.thumbnail_url && (
                <Image source={{ uri: item.thumbnail_url }} style={styles.thumbnail} />
            )}
            <View style={styles.cardContent}>
                <View style={[styles.platformBadge, { backgroundColor: platformColor }]}>
                    <Text style={styles.platformText}>{item.source_platform}</Text>
                </View>
                <Text style={styles.title} numberOfLines={2}>
                    {item.title || 'Untitled'}
                </Text>
                {item.ai_summary && (
                    <Text style={styles.summary} numberOfLines={2}>
                        {item.ai_summary}
                    </Text>
                )}
                <View style={styles.categoriesRow}>
                    {item.categories.slice(0, 3).map((cat, idx) => (
                        <View key={idx} style={styles.categoryBadge}>
                            <Text style={styles.categoryText}>{cat}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default function HomeScreen() {
    const [items, setItems] = useState<SavedItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            const [itemsData, categoriesData] = await Promise.all([
                api.getItems(50, selectedCategory || undefined),
                api.getCategories(),
            ]);
            setItems(itemsData);
            setCategories(categoriesData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedCategory]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const openItem = (item: SavedItem) => {
        if (item.source_url) {
            Linking.openURL(item.source_url);
        }
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <Text style={styles.headerTitle}>MindBase</Text>
            <Text style={styles.headerSubtitle}>
                {items.length} saved items
            </Text>

            <FlatList
                horizontal
                data={[{ id: 'all', name: 'All', color: '#6366F1', item_count: items.length }, ...categories]}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                style={styles.categoryFilter}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[
                            styles.filterChip,
                            (selectedCategory === null && item.id === 'all') || selectedCategory === item.name
                                ? { backgroundColor: item.color }
                                : { backgroundColor: '#2a2a3e' },
                        ]}
                        onPress={() => setSelectedCategory(item.id === 'all' ? null : item.name)}
                    >
                        <Text style={styles.filterText}>{item.name}</Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <ItemCard item={item} onPress={() => openItem(item)} />
                )}
                ListHeaderComponent={renderHeader}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyTitle}>No saved items yet</Text>
                        <Text style={styles.emptySubtitle}>
                            Share links from any app to save them here
                        </Text>
                    </View>
                }
                contentContainerStyle={styles.listContent}
            />
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
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#888',
        marginTop: 4,
    },
    categoryFilter: {
        marginTop: 16,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
    },
    filterText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    listContent: {
        paddingBottom: 100,
    },
    card: {
        backgroundColor: '#1a1a2e',
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 16,
        overflow: 'hidden',
    },
    thumbnail: {
        width: '100%',
        height: 180,
        backgroundColor: '#2a2a3e',
    },
    cardContent: {
        padding: 16,
    },
    platformBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 8,
    },
    platformText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        lineHeight: 24,
    },
    summary: {
        fontSize: 14,
        color: '#aaa',
        marginTop: 8,
        lineHeight: 20,
    },
    categoriesRow: {
        flexDirection: 'row',
        marginTop: 12,
        flexWrap: 'wrap',
    },
    categoryBadge: {
        backgroundColor: '#2a2a3e',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginRight: 6,
        marginBottom: 4,
    },
    categoryText: {
        color: '#8b8bf5',
        fontSize: 12,
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 100,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        marginTop: 8,
    },
});
