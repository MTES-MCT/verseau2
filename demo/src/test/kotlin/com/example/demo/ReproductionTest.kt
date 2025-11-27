package com.example.demo

import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.dataformat.xml.XmlMapper
import com.fasterxml.jackson.module.kotlin.KotlinModule
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertEquals

class ReproductionTest {

    @Test
    fun `should deserialize Depot with full structure`() {
        val xml = """
<FctAssain  xsi:schemaLocation="http://xml.sandre.eaufrance.fr/scenario/fct_assain/4 http://xml.sandre.eaufrance.fr/scenario/fct_assain/4/sandre_sc_fct_assain.xsd" xmlns="http://xml.sandre.eaufrance.fr/scenario/fct_assain/4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <Scenario>
        <CodeScenario>FCT_ASSAIN</CodeScenario>
        <VersionScenario>4</VersionScenario>
        <NomScenario>Autosurveillance des systèmes de collecte et de traitement des eaux usées d'origine urbaine</NomScenario>
        <DateCreationFichier>2025-01-15</DateCreationFichier>
        <DateDebutReference>2024-01-01</DateDebutReference>
        <DateFinReference>2024-12-31</DateFinReference>
        <Emetteur>
            <CdIntervenant schemeAgencyID="SIRET">12345678901234</CdIntervenant>
            <NomIntervenant>Société Test A</NomIntervenant>
        </Emetteur>
        <Destinataire>
            <CdIntervenant schemeAgencyID="SIRET">98765432109876</CdIntervenant>
            <NomIntervenant>Organisation Test B</NomIntervenant>
            <RueIntervenant>123, rue de Test</RueIntervenant>
            <VilleIntervenant>VILLE-TEST</VilleIntervenant>
        </Destinataire>
  </Scenario>
	  <OuvrageDepollution>
        <CdOuvrageDepollution>0400000T0001</CdOuvrageDepollution>
        <TypeOuvrageDepollution>4</TypeOuvrageDepollution>
        <NomOuvrageDepollution>Station Test Anonyme</NomOuvrageDepollution>
        <Commune>
            <CdCommune>12345</CdCommune>
            <LbCommune>COMMUNE-TEST</LbCommune>
        </Commune>
        <NatureSystTraitementEauxUsees>1</NatureSystTraitementEauxUsees>
        <PointMesure>
            <NumeroPointMesure>10001</NumeroPointMesure>
            <LbPointMesure>Point Mesure Test 1</LbPointMesure>
            <LocGlobalePointMesure>P1</LocGlobalePointMesure>
            <Prlvt>
                <DatePrlvt>2024-12-31</DatePrlvt>
                <Support>
                    <CdSupport>33</CdSupport>
                </Support>
                <Analyse>
                    <RsAnalyse>0</RsAnalyse>
                    <CdRemAnalyse>1</CdRemAnalyse>
                    <InSituAnalyse>1</InSituAnalyse>
                    <StatutRsAnalyse>A</StatutRsAnalyse>
                    <QualRsAnalyse>4</QualRsAnalyse>
                    <FractionAnalysee>
                        <CdFractionAnalysee>158</CdFractionAnalysee>
                    </FractionAnalysee>
                    <Parametre>
                        <CdParametre>1098</CdParametre>
                    </Parametre>
                    <UniteMesure>
                        <CdUniteMesure>115</CdUniteMesure>
                    </UniteMesure>
                    <FinaliteAnalyse>1</FinaliteAnalyse>
                </Analyse>
            </Prlvt>
        </PointMesure>
		        <PointMesure>
            <NumeroPointMesure>10001</NumeroPointMesure>
            <LbPointMesure>Point Mesure Test 1</LbPointMesure>
            <LocGlobalePointMesure>P1</LocGlobalePointMesure>
            <Prlvt>
                <DatePrlvt>2024-12-31</DatePrlvt>
                <Support>
                    <CdSupport>33</CdSupport>
                </Support>
                <Analyse>
                    <RsAnalyse>0</RsAnalyse>
                    <CdRemAnalyse>1</CdRemAnalyse>
                    <InSituAnalyse>1</InSituAnalyse>
                    <StatutRsAnalyse>A</StatutRsAnalyse>
                    <QualRsAnalyse>4</QualRsAnalyse>
                    <FractionAnalysee>
                        <CdFractionAnalysee>158</CdFractionAnalysee>
                    </FractionAnalysee>
                    <Parametre>
                        <CdParametre>1098</CdParametre>
                    </Parametre>
                    <UniteMesure>
                        <CdUniteMesure>115</CdUniteMesure>
                    </UniteMesure>
                    <FinaliteAnalyse>1</FinaliteAnalyse>
                </Analyse>
            </Prlvt>
        </PointMesure>
	   </OuvrageDepollution>
   </FctAssain>
        """

        val xmlMapper = XmlMapper().apply {
            registerModule(KotlinModule.Builder().build())
            configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
        }

        val depot = xmlMapper.readValue(xml, Depot::class.java)

        assertNotNull(depot.scenario)
        assertEquals("FCT_ASSAIN", depot.scenario?.codeScenario)
        assertEquals("4", depot.scenario?.versionScenario)
        assertEquals("Société Test A", depot.scenario?.emetteur?.nomIntervenant)
        assertEquals("12345678901234", depot.scenario?.emetteur?.cdIntervenant?.value)
        assertEquals("SIRET", depot.scenario?.emetteur?.cdIntervenant?.schemeAgencyID)

        assertNotNull(depot.scenario?.destinataire)
        assertEquals("Organisation Test B", depot.scenario?.destinataire?.nomIntervenant)
        assertEquals("VILLE-TEST", depot.scenario?.destinataire?.villeIntervenant)

        assertNotNull(depot.ouvrageDepollution)
        assertEquals("0400000T0001", depot.ouvrageDepollution?.cdOuvrageDepollution)
        assertEquals("4", depot.ouvrageDepollution?.typeOuvrageDepollution)
        assertEquals("12345", depot.ouvrageDepollution?.commune?.cdCommune)

        assertNotNull(depot.ouvrageDepollution?.pointMesures)
        assertEquals(2, depot.ouvrageDepollution?.pointMesures?.size)
        val pm = depot.ouvrageDepollution?.pointMesures?.get(0)
        assertEquals("10001", pm?.numeroPointMesure)
        assertEquals("Point Mesure Test 1", pm?.lbPointMesure)
        assertEquals("P1", pm?.locGlobalePointMesure)

        assertNotNull(pm?.prlvt)
        assertEquals("2024-12-31", pm?.prlvt?.datePrlvt)
        assertEquals("33", pm?.prlvt?.support?.cdSupport)
        assertEquals("0", pm?.prlvt?.analyse?.rsAnalyse)
        assertEquals("1098", pm?.prlvt?.analyse?.parametre?.cdParametre)
    }
}
