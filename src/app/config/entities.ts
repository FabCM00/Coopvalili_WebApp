export interface Entity {
    slug: string;
    name: string;
    description: string;
    url: string;
    color: string;
    status: "active" | "inactive";
}

export const entities: Entity[] = [
    {
        slug: "coprodigital",
        name: "CoproDigital",
        description: "Gestión de créditos en línea para copropiedades",
        url: process.env.NEXT_PUBLIC_COPRODIGITAL_URL || "",
        color: "#012340",
        status: "active",
    },
    {
        slug: "fondex",
        name: "Fondex",
        description: "Sistema de fondos y gestión financiera",
        url: process.env.NEXT_PUBLIC_FONDEX_URL || "",
        color: "#1a5276",
        status: "active",
    },
];

export function getEntityBySlug(slug: string): Entity | undefined {
    return entities.find((e) => e.slug === slug);
}
