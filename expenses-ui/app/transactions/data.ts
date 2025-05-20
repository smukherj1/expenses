export type Transaction = {
    id: number
    date: Date
    description: string
    amount: string
    source: string
    tags: string[]
}

export const transactions: Transaction[] = [
    {
        id: 1,
        date: new Date("Jan 1, 2015"),
        description: "Food Basics",
        amount: "49.51",
        source: "RBC_MASTERCARD",
        tags: ["groceries"],
    },
    {
        id: 2,
        date: new Date("Jan 8, 2015"),
        description: "Freschco",
        amount: "39.51",
        source: "RBC_MASTERCARD",
        tags: ["groceries"],
    },
    {
        id: 3,
        date: new Date("Jan 9, 2015"),
        description: "Madras Masala",
        amount: "29.51",
        source: "RBC_MASTERCARD",
        tags: ["restaurant"],
    },
]
