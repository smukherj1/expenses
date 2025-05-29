// Format date as yyyy/mm/dd.
export function formatDate(date: Date | undefined): string {
    if (date == undefined) {
        date = new Date();
    }
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
    const day = date.getDate().toString().padStart(2, '0');

    return `${year}/${month}/${day}`;
}