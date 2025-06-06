# Welcome to Our VLC clone project 👋

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

### Key Notes:

- Use descriptive branch names (e.g., `fix/header-style`, `docs/update-readme`).
- Ensure you’re on the correct base branch (e.g., `main` or `develop`) before creating a new branch.
