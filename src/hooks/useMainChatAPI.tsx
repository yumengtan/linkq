// Copyright (c) 2024 Massachusetts Institute of Technology
// SPDX-License-Identifier: MIT
import { createContext, useContext } from "react";
import { ChatAPI } from "utils/ChatAPI";
import { useChatAPIInstance } from "./useChatAPIInstance";
import { INITIAL_SYSTEM_MESSAGE } from "utils/knowledgeBase/prompts";

//create a context to let any component use the main chatAPI
export const MainChatAPIContext = createContext<ChatAPI | null>(null);

export function MainChatAPIProvider({
  children,
}:{
  children: React.ReactNode,
}) {
  const chatAPI = useChatAPIInstance({
    chatId: 0,
    systemMessage: INITIAL_SYSTEM_MESSAGE,
  })

  return (
    <MainChatAPIContext.Provider value={chatAPI}>
      {children}
    </MainChatAPIContext.Provider>
  )
}

export function useMainChatAPI() {
  const context = useContext(MainChatAPIContext)
  if (!context) {
    throw new Error('useMainChatAPI must be used within a MainChatAPIProvider')
  }
  return context
}