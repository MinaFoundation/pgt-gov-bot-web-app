'use client'

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
import { Loader2, LogOut, User, Wallet } from "lucide-react"
import { 
  DiscordLogoIcon, 
  ChatBubbleIcon,
} from "@radix-ui/react-icons"
import { useState } from 'react'
import type { AuthSource } from '@/contexts/AuthContext'

const AUTH_PROVIDER_ICONS = {
  discord: DiscordLogoIcon,
  telegram: ChatBubbleIcon,
  wallet: Wallet,
} as const satisfies Record<AuthSource['type'], React.ComponentType>

const AUTH_PROVIDER_NAMES = {
  discord: 'Discord',
  telegram: 'Telegram',
  wallet: 'Wallet',
} as const satisfies Record<AuthSource['type'], string>

export function UserStatus() {
  const { user, isLoading, login, logout, refresh } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await logout()
      await refresh()
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (isLoading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="sr-only">Loading</span>
      </Button>
    )
  }

  if (!user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <User className="h-4 w-4" />
            <span className="sr-only">User menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Sign In</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => login('discord')}>
            <DiscordLogoIcon className="mr-2 h-4 w-4 text-[#5865F2]" />
            Login with Discord
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => login('telegram')}>
            <ChatBubbleIcon className="mr-2 h-4 w-4 text-[#0088cc]" />
            Login with Telegram
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => login('wallet')}>
            <Wallet className="mr-2 h-4 w-4 text-orange-500" />
            Login with Wallet
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Get auth info from user metadata
  const authSource = user.metadata.authSource
  let username = user.metadata.username

  if (authSource.type === 'wallet') {
    username = username.slice(0, 6) + '...' + username.slice(-4)
  }

  const ProviderIcon = AUTH_PROVIDER_ICONS[authSource.type]
  const providerName = AUTH_PROVIDER_NAMES[authSource.type]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={cn(
            "flex items-center gap-2 px-3 py-2 h-auto",
            authSource.type === 'discord' && "text-[#5865F2]",
            authSource.type === 'telegram' && "text-[#0088cc]",
            authSource.type === 'wallet' && "text-orange-500"
          )}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <ProviderIcon className="h-4 w-4" />
              <span className="text-sm text-muted-foreground hidden md:inline-block">
                {username}
              </span>
            </>
          )}
          <span className="sr-only">
            Logged in as {username}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{username}</p>
            <p className="text-xs leading-none text-muted-foreground">
              Connected via {providerName}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="text-red-600 focus:text-red-600"
        >
          {isLoggingOut ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 