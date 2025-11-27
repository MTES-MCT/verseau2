import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlElementWrapper
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlProperty
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlRootElement
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlText

@JacksonXmlRootElement(localName = "FctAssain")
data class Depot(
    @param:JacksonXmlProperty(localName = "Scenario")
    val scenario: Scenario?,
    @param:JacksonXmlProperty(localName = "OuvrageDepollution")
    @param:JacksonXmlElementWrapper(useWrapping = false)
    val ouvrageDepollutions: List<OuvrageDepollution>?,
    @param:JacksonXmlProperty(isAttribute = true, localName = "schemaLocation")
    val schemaLocation: String? = null,
    @param:JacksonXmlProperty(isAttribute = true, localName = "xmlns")
    val xmlns: String? = null,
    @param:JacksonXmlProperty(isAttribute = true, localName = "xsi")
    val xsi: String? = null
)

class CdIntervenant {
    @JacksonXmlProperty(isAttribute = true, localName = "schemeAgencyID")
    var schemeAgencyID: String? = null

    @JacksonXmlText
    var value: String? = null

    constructor()

    constructor(schemeAgencyID: String?, value: String?) {
        this.schemeAgencyID = schemeAgencyID
        this.value = value
    }
}

data class Emetteur(
    @param:JacksonXmlProperty(localName = "CdIntervenant")
    val cdIntervenant: CdIntervenant?,
    @param:JacksonXmlProperty(localName = "NomIntervenant")
    val nomIntervenant: String?
)

data class Destinataire(
    @param:JacksonXmlProperty(localName = "CdIntervenant")
    val cdIntervenant: CdIntervenant?,
    @param:JacksonXmlProperty(localName = "NomIntervenant")
    val nomIntervenant: String?,
    @param:JacksonXmlProperty(localName = "RueIntervenant")
    val rueIntervenant: String?,
    @param:JacksonXmlProperty(localName = "VilleIntervenant")
    val villeIntervenant: String?
)

data class Scenario(
    @param:JacksonXmlProperty(localName = "CodeScenario")
    val codeScenario: String?,
    @param:JacksonXmlProperty(localName = "VersionScenario")
    val versionScenario: String?,
    @param:JacksonXmlProperty(localName = "NomScenario")
    val nomScenario: String?,
    @param:JacksonXmlProperty(localName = "DateCreationFichier")
    val dateCreationFichier: String?, // Using String for Date to avoid parsing issues
    @param:JacksonXmlProperty(localName = "DateDebutReference")
    val dateDebutReference: String?, // Using String for Date
    @param:JacksonXmlProperty(localName = "DateFinReference")
    val dateFinReference: String?, // Using String for Date
    @param:JacksonXmlProperty(localName = "Emetteur")
    val emetteur: Emetteur?,
    @param:JacksonXmlProperty(localName = "Destinataire")
    val destinataire: Destinataire?
)

data class Commune(
    @param:JacksonXmlProperty(localName = "CdCommune")
    val cdCommune: String?,
    @param:JacksonXmlProperty(localName = "LbCommune")
    val lbCommune: String?
)

data class Support(
    @param:JacksonXmlProperty(localName = "CdSupport")
    val cdSupport: String?
)

data class FractionAnalysee(
    @param:JacksonXmlProperty(localName = "CdFractionAnalysee")
    val cdFractionAnalysee: String?
)

data class Parametre(
    @param:JacksonXmlProperty(localName = "CdParametre")
    val cdParametre: String?
)

data class UniteMesure(
    @param:JacksonXmlProperty(localName = "CdUniteMesure")
    val cdUniteMesure: String?
)

data class Analyse(
    @param:JacksonXmlProperty(localName = "RsAnalyse")
    val rsAnalyse: String?,
    @param:JacksonXmlProperty(localName = "CdRemAnalyse")
    val cdRemAnalyse: String?,
    @param:JacksonXmlProperty(localName = "InSituAnalyse")
    val inSituAnalyse: String?,
    @param:JacksonXmlProperty(localName = "StatutRsAnalyse")
    val statutRsAnalyse: String?,
    @param:JacksonXmlProperty(localName = "QualRsAnalyse")
    val qualRsAnalyse: String?,
    @param:JacksonXmlProperty(localName = "FractionAnalysee")
    val fractionAnalysee: FractionAnalysee?,
    @param:JacksonXmlProperty(localName = "Parametre")
    val parametre: Parametre?,
    @param:JacksonXmlProperty(localName = "UniteMesure")
    val uniteMesure: UniteMesure?,
    @param:JacksonXmlProperty(localName = "FinaliteAnalyse")
    val finaliteAnalyse: String?
)

data class Prlvt(
    @param:JacksonXmlProperty(localName = "DatePrlvt")
    val datePrlvt: String?, // Using String for Date
    @param:JacksonXmlProperty(localName = "Support")
    val support: Support?,
    @param:JacksonXmlProperty(localName = "Analyse")
    val analyse: Analyse?
)

data class PointMesure(
    @param:JacksonXmlProperty(localName = "NumeroPointMesure")
    val numeroPointMesure: String?,
    @param:JacksonXmlProperty(localName = "LbPointMesure")
    val lbPointMesure: String?,
    @param:JacksonXmlProperty(localName = "LocGlobalePointMesure")
    val locGlobalePointMesure: String?,
    @param:JacksonXmlProperty(localName = "Prlvt")
    val prlvt: Prlvt?
)

data class OuvrageDepollution(
    @param:JacksonXmlProperty(localName = "CdOuvrageDepollution")
    val cdOuvrageDepollution: String?,
    @param:JacksonXmlProperty(localName = "TypeOuvrageDepollution")
    val typeOuvrageDepollution: String?,
    @param:JacksonXmlProperty(localName = "NomOuvrageDepollution")
    val nomOuvrageDepollution: String?,
    @param:JacksonXmlProperty(localName = "Commune")
    val commune: Commune?,
    @param:JacksonXmlProperty(localName = "NatureSystTraitementEauxUsees")
    val natureSystTraitementEauxUsees: String?,
    @param:JacksonXmlElementWrapper(useWrapping = false)
    @param:JacksonXmlProperty(localName = "PointMesure")
    val pointMesures: List<PointMesure>?
)

