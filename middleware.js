export { default } from "next-auth/middleware";

export const config = {
    matcher: ['/admin'] // here can be added more protected pages
}