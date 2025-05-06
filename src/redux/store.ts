// Copyright (c) 2024 Massachusetts Institute of Technology
// SPDX-License-Identifier: MIT
import { useDispatch, useSelector } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { chatHistorySliceReducer } from './chatHistorySlice'
import { queryValueReducer } from './queryValueSlice'
import { resultsReducer } from './resultsSlice'
import { queryHistoryReducer } from './queryHistorySlice'
import { settingsReducer } from './settingsSlice'
import { neo4jConnectionReducer } from './neo4jConnectionSlice'

export const store = configureStore({
  reducer: {
    chatHistory: chatHistorySliceReducer,
    queryValue: queryValueReducer,
    results: resultsReducer,
    queryHistory: queryHistoryReducer,
    settings: settingsReducer,
    neo4jConnection: neo4jConnectionReducer,
  },
})

//based on https://redux.js.org/tutorials/typescript-quick-start

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred dispatch
export type AppDispatch = typeof store.dispatch


// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector = <T>(selector: (state: RootState) => T): T => useSelector<RootState, T>(selector)

