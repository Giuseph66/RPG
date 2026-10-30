/** Ficha ativa resumida para a Home; só dados reais, nunca estatística inventada. */
export interface HomeCharacter {
  readonly id: string;
  readonly name: string;
  /** Classe e nível, ex.: "Druida 1". */
  readonly detail?: string;
  /** Id da classe, usado só para escolher a arte. */
  readonly classId?: string;
  readonly hp?: { readonly current: number; readonly maximum?: number; readonly temporary?: number };
  readonly conditions?: number;
}

export interface HomeCampaign {
  readonly name: string;
  readonly description?: string;
  readonly activeQuests: number;
  readonly objectives: number;
  /** Papel da conta na campanha ativa, quando conhecido. */
  readonly role?: "master" | "player";
}

export interface HomeDraft {
  readonly id: string;
  readonly name?: string;
  /** Etapa em que a criação parou, ex.: "Classe". */
  readonly step?: string;
}

export type HomeStatus = "idle" | "loading";

export interface HomePanelProps {
  readonly status?: HomeStatus;
  readonly character?: HomeCharacter;
  readonly campaign?: HomeCampaign;
  /** Rascunho mais recente, retomável. */
  readonly draft?: HomeDraft;
  /** Quantas fichas existem neste aparelho (para oferecer a troca). */
  readonly characterCount?: number;
  readonly signedIn?: boolean;
  readonly onOpenCharacter?: () => void;
  readonly onCreateCharacter?: () => void;
  readonly onResumeDraft?: (id: string) => void;
  readonly onNavigate?: (to: string) => void;
}
