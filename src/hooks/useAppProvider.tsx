import { useContext } from "react"

import { AppProviderContext } from "@/lib/AppContext"

export const useAppProvider = () => useContext(AppProviderContext)