# Welcome to Visura 👋

## Get started

follow the procedures to get started with the installation of the project

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

## where are the dependencies already installed

```json
{
  "@react-navigation/bottom-tabs": "^7.3.10",
  "@react-navigation/elements": "^2.3.8",
  "@react-navigation/native": "^7.1.6",
  "babel-plugin-module-resolver": "^5.0.2",
  "expo": "~53.0.10",
  "expo-blur": "~14.1.5",
  "expo-constants": "~17.1.6",
  "expo-font": "~13.3.1",
  "expo-haptics": "~14.1.4",
  "expo-image": "~2.2.0",
  "expo-linking": "~7.1.5",
  "expo-router": "~5.0.7",
  "expo-splash-screen": "~0.30.9",
  "expo-status-bar": "~2.2.3",
  "expo-symbols": "~0.4.5",
  "expo-system-ui": "~5.0.8",
  "expo-web-browser": "~14.1.6",
  "nativewind": "^4.1.23",
  "react": "19.0.0",
  "react-dom": "19.0.0",
  "react-native": "0.79.3",
  "react-native-css-interop": "^0.1.22",
  "react-native-gesture-handler": "~2.24.0",
  "react-native-reanimated": "~3.17.4",
  "react-native-safe-area-context": "^5.4.1",
  "react-native-screens": "~4.11.1",
  "react-native-svg": "^15.2.0",
  "react-native-web": "~0.20.0",
  "react-native-webview": "13.13.5",
  "tailwindcss": "^3.4.17",
  "zustand": "^5.0.5"
}
```

| Dependecy   | Use                                                      |
| ----------- | -------------------------------------------------------- |
| Tailwindcss | already packaged css for easy styling                    |
| Zustand     | Easy state management solution to help with data storage |
| clsx        | A tailwindcss package to help with dynamic classNames    |

## Note

- _Do not configure the "app/\_layout.jsx"_

To create a new Git branch, follow these steps:

# Follow the steps to create a branch and append it

---

### 1. **Check Current Branches**

```sh
git branch
```

This shows all local branches, with the current one marked by an asterisk (`*`).

### 2. **Create a New Branch**

```sh
git branch <branch-name>
```

Replace `<branch-name>` with your desired branch name (e.g., `feature/login`).

### 3. **Switch to the New Branch**

```sh
git checkout <branch-name>
```

Or, combine branch creation and switching in one command:

```sh
git checkout -b <branch-name>
```

### 4. **Push the Branch to Remote (Optional)**

If you want to push the branch to a remote repository (e.g., GitHub, GitLab):

```sh
git push -u origin <branch-name>
```

The `-u` flag sets the upstream, linking your local branch to the remote one.

### Example Workflow

```sh
# Create and switch to a new branch
git checkout -b feature/login

# Make changes, then commit
git add .
git commit -m "Add login feature"

# Push to remote (first time)
git push -u origin feature/login
```

## Here is a document on the **useThemeStore**

```javascript
   //to import is use this methode
   import useThemeStore from "../../../store/theme"; //it is located in the store folder

   const index = () => {
   const {toggleTheme, themeColor} = useThemeStore();
   return (
      // your codes here
   );
   };

   //the toggleTheme is a function which changes the theme
   //the themeColor contains the colors to be used for the project

```

## Here are the colors

```javascript
const baseTheme = {
  primary: "#f44bf8",
  shadow: "#f44bf8",
  descText: "#8e8e8e",
  iconBackground: "#f44bf8",
};

return themeType === "light"
  ? {
      ...baseTheme,
      background: "#fff",
      tabIconColor: "#000",
      ribbon: "#2b2138",
      text: "#000",
    }
  : {
      ...baseTheme,
      background: "#111017",
      tabIconColor: "#fff",
      ribbon: "#f44bf8",
      text: "#fff",
    };
```

## Sample Video Links for Streaming Demo

Use these direct video links to test the streaming functionality during your presentation:

1. **Big Buck Bunny (MP4)**
   https://www.w3schools.com/html/mov_bbb.mp4

2. **Sintel Trailer (MP4)**
   https://media.w3.org/2010/05/sintel/trailer.mp4

3. **Tears of Steel (MP4)**
   https://archive.org/download/TearsOfSteel/tears_of_steel_1080p.mp4

4. **Elephants Dream (MP4)**
   https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4

5. **For Bigger Blazes (MP4, Google Sample)**
   https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4

Copy and paste any of these links into the stream modal to quickly demonstrate video streaming.
