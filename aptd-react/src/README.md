# APTD React Application with Zustand

This project is a React application for the APTD (Access Point Traffic Director) system. It includes both the original Redux-based implementation and a new Zustand-based implementation.

## Architecture Overview

The application has two main versions:

1. **Original Version**: Uses Redux for state management and class-based components
2. **Zustand Version**: Uses Zustand for state management and functional components with hooks

### Zustand Version Components

The Zustand version of the application is organized as follows:

- **ZustandApp**: The main entry point for the Zustand version
- **ZustandLayout**: Contains the layout for the Zustand version, with MapAndTrayPanel on the left and ZustandInfoPanel on the right
- **MapAndTrayPanel**: Displays the map and tray, with pan and zoom functionality
- **ZustandInfoPanel**: Displays the appropriate info panel based on the current selection

### Stores

The Zustand version uses several stores for state management:

- **store.ts**: The main store for the application
- **mapTrayStore.ts**: Manages the state of the map and tray, including pan and zoom
- **hooks.ts**: Contains hooks for accessing and updating the application state

## Switching Between Versions

The application includes a toggle button to switch between the original and Zustand versions:

1. In the original version, click the "Switch to Zustand Version" button in the top bar
2. In the Zustand version, click the "Switch to Original Version" button in the toolbar

## Development

### Adding New Components

To add a new component to the Zustand version:

1. Create a new component in the `components` directory
2. Use hooks from `store/hooks.ts` to access and update the application state
3. Add the component to the appropriate parent component

### Adding New State

To add new state to the Zustand version:

1. Add the new state to the appropriate store in `store` directory
2. Create actions for updating the state
3. Create selectors for accessing the state
4. Use the state in components via hooks

## Implementation Details

### Pan and Zoom

The pan and zoom functionality is implemented in the `MapAndTrayPanel` component using the `mapTrayStore`. The store manages the following state:

- `zoomLevel`: The current zoom level of the map
- `pan`: The current pan offset of the map
- `isDragging`: Whether the user is currently dragging the map
- `dragStart`: The starting point of the drag
- `dragOffset`: The current offset of the drag

The component uses this state to transform the map content and handle user interactions.

### Selection

The selection functionality is implemented using the `useSelection` hook from `store/hooks.ts`. The hook provides:

- `selected`: The currently selected item
- `selectDevice`: A function to select a device
- `clearSelection`: A function to clear the selection

The `ZustandInfoPanel` component uses the `selected` state to determine which info panel to display.

## Future Improvements

- Complete the migration of all components to the Zustand version
- Improve the performance of the map rendering
- Add more tests for the Zustand version
- Enhance the user interface with more modern design elements 