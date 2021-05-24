/* eslint-disable no-undef */
/// <reference types="cypress"/>

describe('Caso de Teste: 1', () => {
  beforeEach(() => {
    cy.visit('https://imovel-web.vercel.app')
  })

  it('Cenario: Entrar no site do IMOVEL', () => {
    cy.get('h1').should('contain.text', 'Encontre o imóvel ideal para você!')
  })

  it('Cenario: Navegar até a tela de login e realizar o login na aplicação', () => {
    cy.get('.dropdown-toggle > #icon > path').click()
    cy.get('.menu-not-signed > a').click()
    cy.get(':nth-child(2) > .input-container > input').type('user@imovel.com')
    cy.get(':nth-child(3) > .input-container > input').type('12345678')
    cy.get('.button-container').click()
  })

  it('Cenario de Teste: 3', () => {
    // TODO os seus comandos de teste
  })
  it('Cenario de Teste: 4', () => {
    // TODO os seus comandos de teste
  })
  it('Cenario de Teste: 5', () => {
    // TODO os seus comandos de teste
  })
  it('Cenario de Teste: 6', () => {
    // TODO os seus comandos de teste
  })
})