/// <reference types="astro/client" />

declare module "*.generated.json" {
	const value: {
		syncedAt: string | null;
		sourceUser: string;
		projects: unknown[];
	};
	export default value;
}
