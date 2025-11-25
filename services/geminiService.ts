
export const generateMatchCommentary = async (
  winnerName: string,
  loserName: string,
  scoreWinner: number,
  scoreLoser: number,
  roundName: string
): Promise<string> => {
    // Logic replaced with static responses to remove API Key requirement
    const diff = scoreWinner - scoreLoser;
    if (diff > 3) {
        return `¡Paliza histórica! ${winnerName} aplastó a ${loserName} en ${roundName}.`;
    } else if (diff === 0) {
        return `¡Un partido muy reñido en ${roundName} que se decidió por la mínima!`;
    } else {
        return `¡Gran victoria de ${winnerName}! ${loserName} luchó hasta el final en ${roundName}.`;
    }
};

export const generateTeamNames = async (): Promise<string[]> => {
    // Static list of team names (formerly the fallback list)
    return [
        "Los Rayos", "Cyber Punks", "Titanes", "Furia Roja", "Cobras", "Águilas", "Lobos", "Dragones",
        "Tornados", "Espectros", "Galácticos", "Vipers", "Rhinos", "Ninjas", "Cometas",
        "Spartans", "Vikings", "Samurais", "Piratas", "Yetis", "Aliens", "Robots", "Mutantes",
        "Halcones", "Tiburones", "Osos", "Leones", "Tigres", "Panteras", "Jaguares", "Toros",
        "Bisons", "Mammoths", "Dinos", "Raptors", "Phoenix", "Griffins", "Hydras", "Krakens",
        "Titans", "Golems", "Wizards", "Knights", "Archers", "Rogues", "Paladins", "Druids", "Bards",
        "Assassins", "Clerics", "Monks", "Rangers", "Sorcerers", "Warlocks", "Zombies", "Skeletons",
        "Ghosts", "Vampires", "Werewolves", "Goblins", "Orcs", "Trolls", "Giants", "Fairies", "Elves"
    ];
}
