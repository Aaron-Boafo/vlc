const {getDefaultConfig} = require("expo/metro-config");
const {withNativeWind} = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Enable tree shaking and minification (safer approach)
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Enable Hermes for better performance
config.transformer.hermesCommand = "hermes";

module.exports = withNativeWind(config, {input: "./global.css"});
