import React from 'react';
import { View, StyleSheet, useWindowDimensions, Animated } from 'react-native';

export default function Paginator({ data, scrollX }) {
    const { width } = useWindowDimensions();

    return (
        <View style={styles.container}>
            {data.map((item, i) => {
                const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

                const dotWidth = scrollX.interpolate({
                    inputRange,
                    outputRange: [10, 20, 10],
                    extrapolate: 'clamp',
                });

                const opacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.3, 1, 0.3],
                    extrapolate: 'clamp',
                });

                const color = scrollX.interpolate({
                    inputRange: data.map((_, index) => index * width),
                    outputRange: data.map(d => d.gradient[0]),
                    extrapolate: 'clamp'
                });

                return (
                    <Animated.View 
                        style={[
                            styles.dot, 
                            { 
                                width: dotWidth, 
                                opacity,
                                backgroundColor: color,
                            }
                        ]} 
                        key={i.toString()} 
                    />
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        height: 64,
        justifyContent: 'center',
        alignItems: 'center'
    },
    dot: {
        height: 10,
        borderRadius: 5,
        marginHorizontal: 8,
    },
}); 