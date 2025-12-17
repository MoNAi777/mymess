/**
 * MindBase - Home Screen
 * Shows saved items feed with FAB for clipboard paste
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
    Alert,
    Animated,
    Dimensions,
} from 'react-native';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import Clipboard from '@react-native-clipboard/clipboard';
import { api, SavedItem, Category } from '../api';
import SaveDialog from '../components/SaveDialog';
import { useBubble } from '../contexts/BubbleContext';
import { supabase } from '../config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
    onDelete: () => void;
    onStar: () => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, onPress, onDelete, onStar }) => {
    const platformColor = platformColors[item.source_platform] || platformColors.generic;

    const renderRightActions = (
        progress: Animated.AnimatedInterpolation<number>,
        dragX: Animated.AnimatedInterpolation<number>
    ) => {
        const scale = dragX.interpolate({
            inputRange: [-100, 0],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });

        return (
            <View style={styles.swipeActions}>
                <Animated.View style={[styles.swipeAction, styles.starAction, { transform: [{ scale }] }]}>
                    <TouchableOpacity onPress={onStar} style={styles.swipeButton}>
                        <Text style={styles.swipeIcon}>{item.is_starred ? '★' : '☆'}</Text>
                        <Text style={styles.swipeText}>{item.is_starred ? 'Unstar' : 'Star'}</Text>
                    </TouchableOpacity>
                </Animated.View>
                <Animated.View style={[styles.swipeAction, styles.deleteAction, { transform: [{ scale }] }]}>
                    <TouchableOpacity onPress={onDelete} style={styles.swipeButton}>
                        <Text style={styles.swipeIcon}>🗑️</Text>
                        <Text style={styles.swipeText}>Delete</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        );
    };

    return (
        <Swipeable renderRightActions={renderRightActions} rightThreshold={40}>
            <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
                {item.thumbnail_url && (
                    <Image source={{ uri: item.thumbnail_url }} style={styles.thumbnail} />
                )}
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.platformBadge, { backgroundColor: platformColor }]}>
                            <Text style={styles.platformText}>{item.source_platform}</Text>
                        </View>
                        {item.is_starred && (
                            <Text style={styles.starIndicator}>★</Text>
                        )}
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
        </Swipeable>
    );
};

export default function HomeScreen() {
    const [items, setItems] = useState<SavedItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Clipboard FAB state
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [clipboardContent, setClipboardContent] = useState('');

    // Bubble context
    const { showBubbleSettings } = useBubble();

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
        } else {
            // Show content in alert for now (TODO: create detail screen)
            Alert.alert(
                item.title || 'Saved Content',
                item.raw_content?.substring(0, 500) || 'No content',
                [{ text: 'OK' }]
            );
        }
    };

    const handleDelete = (item: SavedItem) => {
        Alert.alert(
            'Delete Item',
            'Are you sure you want to delete this item?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.deleteItem(item.id);
                            setItems(prev => prev.filter(i => i.id !== item.id));
                            Alert.alert('Deleted', 'Item has been deleted');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete item');
                        }
                    },
                },
            ]
        );
    };

    const handleStar = async (item: SavedItem) => {
        try {
            const result = await api.toggleStar(item.id);
            setItems(prev =>
                prev.map(i =>
                    i.id === item.id ? { ...i, is_starred: result.is_starred } : i
                )
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to update star status');
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await supabase.auth.signOut();
                        } catch (error) {
                            console.error('Logout error:', error);
                        }
                    },
                },
            ]
        );
    };

    // FAB: Read clipboard and show save dialog
    const handleFabPress = async () => {
        try {
            const content = await Clipboard.getString();
            if (content && content.trim()) {
                setClipboardContent(content.trim());
                setShowSaveDialog(true);
            } else {
                Alert.alert('Empty Clipboard', 'Copy some text or a link first, then tap the + button to save it.');
            }
        } catch (error) {
            Alert.alert('Clipboard Error', 'Could not read clipboard. Please try again.');
        }
    };

    // Save content from clipboard
    const handleSaveFromClipboard = async (notes?: string) => {
        try {
            await api.saveContent(clipboardContent, notes);
            setShowSaveDialog(false);
            setClipboardContent('');
            Alert.alert('Saved!', 'Content saved to MindBase');
            loadData(); // Refresh the list
        } catch (error: any) {
            Alert.alert('Save Failed', error?.message || 'Could not save content.');
            throw error;
        }
    };

    const handleCancelSave = () => {
        setShowSaveDialog(false);
        setClipboardContent('');
    };

    // Determine content type from clipboard
    const getContentType = (): 'text' | 'url' | 'file' => {
        if (clipboardContent.startsWith('http://') || clipboardContent.startsWith('https://')) {
            return 'url';
        }
        return 'text';
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerRow}>
                <Text style={styles.headerTitle}>MindBase</Text>
                <View style={styles.headerButtons}>
                    <TouchableOpacity style={styles.headerButton} onPress={showBubbleSettings}>
                        <Text style={styles.headerButtonIcon}>⚙️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
                        <Text style={styles.headerButtonIcon}>🚪</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <Text style={styles.headerSubtitle}>
                {items.length} saved items • Swipe left on item for actions
            </Text>

            <FlatList
                horizontal
                data={[
                    { id: 'all', name: 'All', color: '#6366F1', item_count: items.length },
                    { id: 'starred', name: '★ Starred', color: '#F59E0B', item_count: items.filter(i => i.is_starred).length },
                    ...categories
                ]}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                style={styles.categoryFilter}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[
                            styles.filterChip,
                            (selectedCategory === null && item.id === 'all') ||
                            selectedCategory === item.name ||
                            (selectedCategory === 'starred' && item.id === 'starred')
                                ? { backgroundColor: item.color }
                                : { backgroundColor: '#2a2a3e' },
                        ]}
                        onPress={() => {
                            if (item.id === 'all') {
                                setSelectedCategory(null);
                            } else if (item.id === 'starred') {
                                setSelectedCategory('starred');
                            } else {
                                setSelectedCategory(item.name);
                            }
                        }}
                    >
                        <Text style={styles.filterText}>{item.name}</Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );

    // Filter items by starred if that filter is selected
    const displayItems = selectedCategory === 'starred'
        ? items.filter(i => i.is_starred)
        : items;

    if (loading) {
        return (
            <View style={styles.container}>
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={styles.container}>
            <FlatList
                data={displayItems}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <ItemCard
                        item={item}
                        onPress={() => openItem(item)}
                        onDelete={() => handleDelete(item)}
                        onStar={() => handleStar(item)}
                    />
                )}
                ListHeaderComponent={renderHeader}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyTitle}>
                            {selectedCategory === 'starred' ? 'No starred items' : 'No saved items yet'}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            {selectedCategory === 'starred'
                                ? 'Swipe left on any item and tap ☆ to star it'
                                : 'Share links from any app or tap + to paste from clipboard'}
                        </Text>
                    </View>
                }
                contentContainerStyle={styles.listContent}
            />

            {/* Floating Action Button */}
            <TouchableOpacity style={styles.fab} onPress={handleFabPress} activeOpacity={0.8}>
                <Text style={styles.fabIcon}>+</Text>
            </TouchableOpacity>

            {/* Save Dialog for clipboard content */}
            <SaveDialog
                visible={showSaveDialog}
                content={clipboardContent}
                contentType={getContentType()}
                onSave={handleSaveFromClipboard}
                onCancel={handleCancelSave}
            />
        </GestureHandlerRootView>
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
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    headerButton: {
        padding: 8,
    },
    headerButtonIcon: {
        fontSize: 24,
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
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    platformBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    platformText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    starIndicator: {
        fontSize: 20,
        color: '#F59E0B',
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
    swipeActions: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    swipeAction: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
    },
    swipeButton: {
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
        width: '100%',
    },
    starAction: {
        backgroundColor: '#F59E0B',
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
    },
    deleteAction: {
        backgroundColor: '#EF4444',
        borderTopRightRadius: 16,
        borderBottomRightRadius: 16,
    },
    swipeIcon: {
        fontSize: 24,
        color: '#fff',
    },
    swipeText: {
        fontSize: 12,
        color: '#fff',
        marginTop: 4,
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
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 100,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
    },
    fabIcon: {
        fontSize: 32,
        color: '#fff',
        fontWeight: '300',
        marginTop: -2,
    },
});
