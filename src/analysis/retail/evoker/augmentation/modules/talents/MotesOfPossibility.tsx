import SPELLS from 'common/SPELLS/evoker';
import TALENTS from 'common/TALENTS/evoker';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import { TALENTS_EVOKER } from 'common/TALENTS';
import TalentSpellText from 'parser/ui/TalentSpellText';
import {
  EMPOWER_SANDS_APPLY,
  FIRE_BREATH_INFERNOS_APPLY,
  EMERALD_BLOSSOM_SYMBIOTIC_APPLY,
  PRESCIENCE_BUFF_CAST_LINK,
} from '../normalizers/CastLinkNormalizer';
import Events, { ApplyBuffEvent, HasRelatedEvent, RefreshBuffEvent } from 'parser/core/Events';
import { VersatilityIcon } from 'interface/icons';
import DonutChart from 'parser/ui/DonutChart';
import { SpellLink } from 'interface';
import Combatants from 'parser/shared/modules/Combatants';
import ROLES from 'game/ROLES';
import SPECS, { Spec } from 'game/SPECS';
/**
 * Eruption has a 25% chance to create a Mote of Possibility. Motes of Possibility can be consumed to grant a player Shifting Sands, Inferno's Blessing, or Symbiotic Bloom at random.
 * Clairvoyant: Chance increased to 35%, and can instead grant Prescience.
 */
class MotesOfPossibility extends Analyzer {
  static dependencies = {
    combatants: Combatants,
  };
  protected combatants!: Combatants;
  sandsMotes = 0;
  infernoMotes = 0;
  blossomMotes = 0;
  prescienceMotes = 0;

  personalMotes = 0;
  tankMotes = 0;
  healerMotes = 0;
  meleeHealerMotes = 0;
  prevokerHealerMotes = 0;
  meleeDPSMotes = 0;
  rangedDPSMotes = 0;
  midrangeDPSMotes = 0;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS_EVOKER.MOTES_OF_POSSIBILITY_TALENT);

    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.SHIFTING_SANDS_BUFF),
      this.OnSandsApply,
    );
    this.addEventListener(
      Events.refreshbuff.by(SELECTED_PLAYER).spell(SPELLS.SHIFTING_SANDS_BUFF),
      this.OnSandsApply,
    );

    if (this.selectedCombatant.hasTalent(TALENTS_EVOKER.INFERNOS_BLESSING_TALENT)) {
      this.addEventListener(
        Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.INFERNOS_BLESSING_BUFF),
        this.OnInfernosApplyWithTalent,
      );
      this.addEventListener(
        Events.refreshbuff.by(SELECTED_PLAYER).spell(SPELLS.INFERNOS_BLESSING_BUFF),
        this.OnInfernosApplyWithTalent,
      );
    } else {
      this.addEventListener(
        Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.INFERNOS_BLESSING_BUFF),
        this.OnInfernosApply,
      );
      this.addEventListener(
        Events.refreshbuff.by(SELECTED_PLAYER).spell(SPELLS.INFERNOS_BLESSING_BUFF),
        this.OnInfernosApply,
      );
    }

    if (this.selectedCombatant.hasTalent(TALENTS_EVOKER.SYMBIOTIC_BLOOM_TALENT)) {
      this.addEventListener(
        Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.SYMBIOTIC_BLOOM_BUFF),
        this.OnSymbioticApplyWithTalent,
      );
      this.addEventListener(
        Events.refreshbuff.by(SELECTED_PLAYER).spell(SPELLS.SYMBIOTIC_BLOOM_BUFF),
        this.OnSymbioticApplyWithTalent,
      );
    } else {
      this.addEventListener(
        Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.SYMBIOTIC_BLOOM_BUFF),
        this.OnSymbioticApply,
      );
      this.addEventListener(
        Events.refreshbuff.by(SELECTED_PLAYER).spell(SPELLS.SYMBIOTIC_BLOOM_BUFF),
        this.OnSymbioticApply,
      );
    }

    if (this.selectedCombatant.hasTalent(TALENTS_EVOKER.CLAIRVOYANT_TALENT)) {
      if (this.selectedCombatant.hasTalent(TALENTS_EVOKER.PRESCIENCE_TALENT)) {
        this.addEventListener(
          Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.PRESCIENCE_BUFF),
          this.OnPrescienceApplyWithTalent,
        );
        this.addEventListener(
          Events.refreshbuff.by(SELECTED_PLAYER).spell(SPELLS.PRESCIENCE_BUFF),
          this.OnPrescienceApplyWithTalent,
        );
      } else {
        this.addEventListener(
          Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.PRESCIENCE_BUFF),
          this.OnPrescienceApply,
        );
        this.addEventListener(
          Events.refreshbuff.by(SELECTED_PLAYER).spell(SPELLS.PRESCIENCE_BUFF),
          this.OnPrescienceApply,
        );
      }
    }
  }

  OnSandsApply(event: ApplyBuffEvent | RefreshBuffEvent) {
    if (!HasRelatedEvent(event, EMPOWER_SANDS_APPLY)) {
      this.sandsMotes += 1;
    }
  }

  OnInfernosApply(event: ApplyBuffEvent | RefreshBuffEvent) {
    this.infernoMotes += 1;
    this.OnNonSandsMotesApply(event);
  }

  OnInfernosApplyWithTalent(event: ApplyBuffEvent | RefreshBuffEvent) {
    if (!HasRelatedEvent(event, FIRE_BREATH_INFERNOS_APPLY)) {
      this.infernoMotes += 1;
      this.OnNonSandsMotesApply(event);
    }
  }

  OnSymbioticApply(event: ApplyBuffEvent | RefreshBuffEvent) {
    this.blossomMotes += 1;
    this.OnNonSandsMotesApply(event);
  }

  OnSymbioticApplyWithTalent(event: ApplyBuffEvent | RefreshBuffEvent) {
    if (!HasRelatedEvent(event, EMERALD_BLOSSOM_SYMBIOTIC_APPLY)) {
      this.blossomMotes += 1;
      this.OnNonSandsMotesApply(event);
    }
  }

  OnPrescienceApply(event: ApplyBuffEvent | RefreshBuffEvent) {
    this.prescienceMotes += 1;
    this.OnNonSandsMotesApply(event);
  }

  OnPrescienceApplyWithTalent(event: ApplyBuffEvent | RefreshBuffEvent) {
    if (!HasRelatedEvent(event, PRESCIENCE_BUFF_CAST_LINK)) {
      this.prescienceMotes += 1;
      this.OnNonSandsMotesApply(event);
    }
  }

  OnNonSandsMotesApply(event: ApplyBuffEvent | RefreshBuffEvent) {
    let buffTarget;
    if (this.combatants.players[event.targetID]) {
      buffTarget = event.targetID;
    }
    if (!buffTarget) {
      return;
    }
    const buffedPlayer = this.combatants.players[buffTarget];
    if (buffedPlayer?.spec?.role === ROLES.HEALER) {
      if (buffedPlayer.spec === SPECS.PRESERVATION_EVOKER) {
        this.prevokerHealerMotes += 1;
      } else if (
        buffedPlayer.spec === SPECS.HOLY_PALADIN ||
        buffedPlayer.spec === SPECS.MISTWEAVER_MONK
      ) {
        this.meleeHealerMotes += 1;
      } else {
        this.healerMotes += 1;
      }
    } else if (buffedPlayer?.spec?.role === ROLES.TANK) {
      this.tankMotes += 1;
    } else if (buffTarget === this.owner.info.playerId) {
      this.personalMotes += 1;
    } else if (buffedPlayer?.spec?.role === ROLES.DPS.MELEE) {
      this.meleeDPSMotes += 1;
    } else if (buffedPlayer?.spec?.role === ROLES.DPS.RANGED) {
      if (
        buffedPlayer.spec === SPECS.DEVASTATION_EVOKER ||
        buffedPlayer.spec === SPECS.AUGMENTATION_EVOKER ||
        buffedPlayer.spec === SPECS.DEVOURER_DEMON_HUNTER
      ) {
        this.midrangeDPSMotes += 1;
      } else {
        this.rangedDPSMotes += 1;
      }
    }
  }

  statistic() {
    let moteChart;
    if (this.selectedCombatant.hasTalent(TALENTS_EVOKER.CLAIRVOYANT_TALENT)) {
      moteChart = [
        {
          color: 'rgb(255, 255, 0)',
          label: SPELLS.SHIFTING_SANDS_BUFF.name,
          spellId: SPELLS.SHIFTING_SANDS_BUFF.id,
          valueTooltip: this.sandsMotes,
          value: this.sandsMotes,
        },
        {
          color: 'rgb(254, 59, 59)',
          label: SPELLS.INFERNOS_BLESSING_BUFF.name,
          spellId: SPELLS.INFERNOS_BLESSING_BUFF.id,
          valueTooltip: this.infernoMotes,
          value: this.infernoMotes,
        },
        {
          color: 'rgb(46, 139, 87)',
          label: SPELLS.SYMBIOTIC_BLOOM_BUFF.name,
          spellId: SPELLS.SYMBIOTIC_BLOOM_BUFF.id,
          valueTooltip: this.blossomMotes,
          value: this.blossomMotes,
        },
        {
          color: 'rgb(253, 206, 86)',
          label: TALENTS.PRESCIENCE_TALENT.name,
          spellId: TALENTS.PRESCIENCE_TALENT.id,
          valueTooltip: this.prescienceMotes,
          value: this.prescienceMotes,
        },
      ];
    } else {
      moteChart = [
        {
          color: 'rgb(255, 255, 0)',
          label: SPELLS.SHIFTING_SANDS_BUFF.name,
          spellId: SPELLS.SHIFTING_SANDS_BUFF.id,
          valueTooltip: this.sandsMotes,
          value: this.sandsMotes,
        },
        {
          color: 'rgb(254, 59, 59)',
          label: SPELLS.INFERNOS_BLESSING_BUFF.name,
          spellId: SPELLS.INFERNOS_BLESSING_BUFF.id,
          valueTooltip: this.infernoMotes,
          value: this.infernoMotes,
        },
        {
          color: 'rgb(46, 139, 87)',
          label: SPELLS.SYMBIOTIC_BLOOM_BUFF.name,
          spellId: SPELLS.SYMBIOTIC_BLOOM_BUFF.id,
          valueTooltip: this.blossomMotes,
          value: this.blossomMotes,
        },
      ];
    }
    return (
      <Statistic
        position={STATISTIC_ORDER.OPTIONAL(12)}
        size="flexible"
        category={STATISTIC_CATEGORY.TALENTS}
      >
        <TalentSpellText talent={TALENTS_EVOKER.MOTES_OF_POSSIBILITY_TALENT}>
          <div>
            <VersatilityIcon />{' '}
            {this.sandsMotes + this.infernoMotes + this.blossomMotes + this.prescienceMotes}
            <small>
              {' '}
              <SpellLink spell={TALENTS.MOTES_OF_POSSIBILITY_TALENT} /> used
            </small>
          </div>
        </TalentSpellText>
        <div className="pad">
          <label>Motes of Possibility breakdown</label>
          <DonutChart items={moteChart} />
        </div>
        <div>
          <label>Motes by role</label>
          <ul>
            <li>Tank: {this.tankMotes}</li>
            <li>Melee Healer: {this.meleeHealerMotes}</li>
            <li>Prevoker: {this.prevokerHealerMotes}</li>
            <li>Ranged Healer: {this.healerMotes}</li>
            <li>Melee DPS: {this.meleeDPSMotes}</li>
            <li>Midrange DPS: {this.midrangeDPSMotes}</li>
            <li>Ranged DPS: {this.rangedDPSMotes}</li>
            <li>Personal: {this.personalMotes}</li>
          </ul>
        </div>
      </Statistic>
    );
  }
}

export default MotesOfPossibility;
