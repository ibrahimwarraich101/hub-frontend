// File purpose: Lets visitors who are not logged in browse HUB Store and HUB Food. Anything that needs an account
// (add to cart, cart, checkout, orders) calls useSignInRequest() to open "Sign in"; after signing in, the person returns
// to the page they were on. Outside guest browsing there is no request function and the hook returns a function that does nothing.
import { createContext, useContext } from 'react'

const SignInRequest = createContext<() => void>(() => {})

export const GuestProvider = SignInRequest.Provider

// oxlint-disable-next-line react/only-export-components
export function useSignInRequest(): () => void {
  return useContext(SignInRequest)
}
