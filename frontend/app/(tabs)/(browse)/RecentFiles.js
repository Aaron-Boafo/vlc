import React from 'react';
import { ScrollView, TouchableOpacity, View, Text, Image } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
export default function RecentFiles({ recents, onSelect, themeColors, onClear }) {
  if (!recents || recents.length === 0) return null;
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 7, marginLeft: 8, marginRight: 8, justifyContent: 'space-between' }}>
        <Text style={{ color: themeColors.text, fontWeight: 'bold', fontSize: 19, letterSpacing: 0.2 }}>Recent Files</Text>
        <TouchableOpacity
          onPress={onClear}
          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, backgroundColor: themeColors.sectionBackground, marginLeft: 14 }}
          activeOpacity={0.82}
          accessibilityLabel="Clear recent files"
        >
          <Ionicons name="trash" size={18} color="#E53935" style={{ marginRight: 5 }} />
          <Text style={{ color: '#E53935', fontWeight: 'bold', fontSize: 13 }}>Clear Recents</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 8 }}>
        {recents.map((item, idx) => (
          <TouchableOpacity
            key={item.uri + idx}
            style={{
              backgroundColor: themeColors.sectionBackground,
              borderColor: themeColors.text + '10',
              borderWidth: 1,
              borderRadius: 13,
              marginRight: 12,
              width: 116,
              height: 74,
              overflow: 'hidden',
              shadowColor: themeColors.text,
              shadowOpacity: 0.08,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
              padding: 0,
              alignItems: 'stretch',
              justifyContent: 'flex-end',
            }}
            onPress={() => onSelect(item)}
            activeOpacity={0.82}
          >
            {item.thumbnail ? (
              <>
                <Image source={{ uri: item.thumbnail }} style={{ width: '100%', height: '100%', position: 'absolute', borderRadius: 13 }} resizeMode="cover" />
                <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 0, paddingVertical: 0, backgroundColor: 'rgba(0,0,0,0.34)' }}>
                  <Text numberOfLines={1} style={{ color: '#fff', fontSize: 13, fontWeight: 'bold', paddingHorizontal: 7, paddingTop: 3 }}>{item.name}</Text>
                  <Text numberOfLines={1} style={{ color: '#fff', fontSize: 10, fontWeight: '500', opacity: 0.74, paddingHorizontal: 7, paddingBottom: 4 }}>{item.source}</Text>
                </View>
              </>
            ) : (
              <View style={{ flex: 1, width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: themeColors.text + '07' }}>
                <Text style={{ color: themeColors.text + '55', fontSize: 30 }}>🎬</Text>
                <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.34)' }}>
                  <Text numberOfLines={1} style={{ color: '#fff', fontSize: 13, fontWeight: 'bold', paddingHorizontal: 7, paddingTop: 3 }}>{item.name}</Text>
                  <Text numberOfLines={1} style={{ color: '#fff', fontSize: 10, fontWeight: '500', opacity: 0.74, paddingHorizontal: 7, paddingBottom: 4 }}>{item.source}</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
